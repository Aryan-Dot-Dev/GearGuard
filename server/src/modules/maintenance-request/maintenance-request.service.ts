import { EquipmentStatus, RequestState, RequestType, TeamRole } from "../../common/enums.ts";
import { badRequest, forbidden, notFound } from "../../common/errors.ts";
import { Equipment } from "../../models/equipment.model.ts";
import { MaintenanceRequest } from "../../models/maintenance-request.model.ts";
import { MaintenanceTeam } from "../../models/maintenance-team.model.ts";
import { TeamMember } from "../../models/team-member.model.ts";

const ALLOWED_TRANSITIONS: Record<RequestState, RequestState[]> = {
  [RequestState.New]: [RequestState.InProgress, RequestState.Scrap],
  [RequestState.InProgress]: [RequestState.Repaired, RequestState.Scrap],
  [RequestState.Repaired]: [],
  [RequestState.Scrap]: []
};

export interface CreateRequestInput {
  subject: string;
  description?: string;
  type: RequestType;
  equipmentId: string;
  technicianId?: string;
  scheduledDate?: Date;
  dueDate?: Date;
}

export interface ListRequestFilters {
  state?: RequestState;
  teamId?: string;
  equipmentId?: string;
}

export class MaintenanceRequestService {
  static async create(payload: CreateRequestInput, actor: TeamMember) {
    const equipment = await Equipment.findByPk(payload.equipmentId);
    if (!equipment) {
      throw notFound("Equipment not found");
    }

    if (!Object.values(RequestType).includes(payload.type)) {
      throw badRequest("Invalid request type");
    }

    if (equipment.status === EquipmentStatus.Scrapped) {
      throw badRequest("Cannot create requests for scrapped equipment");
    }

    const teamId = equipment.maintenanceTeamId;

    if (actor.teamId !== teamId) {
      throw forbidden("User must belong to the equipment team");
    }
    const technicianId = payload.technicianId ?? equipment.defaultTechnicianId;
    const technician = await TeamMember.findByPk(technicianId);

    if (!technician || technician.teamId !== teamId) {
      throw badRequest("Technician must belong to the equipment team");
    }

    if (payload.type === RequestType.Preventive && !payload.scheduledDate) {
      throw badRequest("scheduledDate is required for preventive maintenance");
    }

    const scheduledDate = payload.scheduledDate ? new Date(payload.scheduledDate) : undefined;
    const dueDate = payload.dueDate ? new Date(payload.dueDate) : undefined;

    if (scheduledDate && Number.isNaN(scheduledDate.getTime())) {
      throw badRequest("Invalid scheduledDate");
    }

    if (dueDate && Number.isNaN(dueDate.getTime())) {
      throw badRequest("Invalid dueDate");
    }

    return MaintenanceRequest.create({
      subject: payload.subject,
      description: payload.description,
      type: payload.type,
      state: RequestState.New,
      equipmentId: payload.equipmentId,
      teamId,
      technicianId,
      scheduledDate,
      dueDate
    } as any);
  }

  static async list(filters: ListRequestFilters = {}, actor: TeamMember) {
    if (filters.state && !Object.values(RequestState).includes(filters.state)) {
      throw badRequest("Invalid state filter");
    }

    const teamFilter = actor.role === TeamRole.Manager ? {} : { teamId: actor.teamId };

    return MaintenanceRequest.findAll({
      where: {
        ...teamFilter,
        ...(filters.state ? { state: filters.state } : {}),
        ...(filters.teamId ? { teamId: filters.teamId } : {}),
        ...(filters.equipmentId ? { equipmentId: filters.equipmentId } : {})
      },
      include: [Equipment, { model: TeamMember, as: "technician" }]
    });
  }

  static async getById(id: string, actor: TeamMember) {
    const request = await MaintenanceRequest.findByPk(id, {
      include: [Equipment, { model: TeamMember, as: "technician" }]
    });
    if (!request) {
      throw notFound("Maintenance request not found");
    }
    if (request.teamId !== actor.teamId && actor.role !== TeamRole.Manager) {
      throw forbidden("Access denied to this request");
    }
    return request;
  }

  static async assignTechnician(id: string, technicianId: string, actor: TeamMember) {
    const request = await MaintenanceRequest.findByPk(id);
    if (!request) {
      throw notFound("Maintenance request not found");
    }

    if ([RequestState.Repaired, RequestState.Scrap].includes(request.state)) {
      throw badRequest("Cannot reassign a completed or scrapped request");
    }

    const technician = await TeamMember.findByPk(technicianId);
    if (!technician || technician.teamId !== request.teamId) {
      throw badRequest("Technician must belong to the assigned team");
    }

    const isManager = actor.role === TeamRole.Manager && actor.teamId === request.teamId;
    const isSelfAssign = actor.id === technicianId;
    if (!isManager && !isSelfAssign) {
      throw forbidden("Only team managers or the technician may assign");
    }

    await request.update({ technicianId });
    return request.reload();
  }

  static async moveState(id: string, nextState: RequestState, actor: TeamMember) {
    const request = await MaintenanceRequest.findByPk(id);
    if (!request) {
      throw notFound("Maintenance request not found");
    }

    if (!Object.values(RequestState).includes(nextState)) {
      throw badRequest("Invalid state");
    }

    const allowed = ALLOWED_TRANSITIONS[request.state] ?? [];
    if (!allowed.includes(nextState)) {
      throw badRequest(`Cannot transition from ${request.state} to ${nextState}`);
    }

    const isManager = actor.role === TeamRole.Manager && actor.teamId === request.teamId;
    const isTechnician = actor.id === request.technicianId;

    if (nextState === RequestState.Scrap && !isManager) {
      throw forbidden("Only a manager can scrap equipment");
    }

    if (!isManager && !isTechnician) {
      throw forbidden("Only the assigned technician or manager can update status");
    }

    await request.update({ state: nextState });

    if (nextState === RequestState.Scrap) {
      const equipment = await Equipment.findByPk(request.equipmentId);
      if (equipment && equipment.status !== EquipmentStatus.Scrapped) {
        await equipment.update({ status: EquipmentStatus.Scrapped });
      }
    }

    return request.reload();
  }

  static async kanbanView(actor: TeamMember) {
    const now = Date.now();
    const teamFilter = actor.role === TeamRole.Manager ? {} : { teamId: actor.teamId };
    const requests = await MaintenanceRequest.findAll({
      where: teamFilter,
      include: [Equipment, MaintenanceTeam, { model: TeamMember, as: "technician" }],
      order: [["updatedAt", "DESC"]]
    });

    const buckets: Record<RequestState, Record<string, unknown>[]> = {
      [RequestState.New]: [],
      [RequestState.InProgress]: [],
      [RequestState.Repaired]: [],
      [RequestState.Scrap]: []
    };

    requests.forEach((request: MaintenanceRequest) => {
      const plain = request.toJSON() as unknown as Record<string, unknown>;
      const overdue =
        request.dueDate &&
        request.dueDate.getTime() < now &&
        ![RequestState.Repaired, RequestState.Scrap].includes(request.state);

      buckets[request.state].push({ ...plain, overdue });
    });

    return buckets;
  }
}

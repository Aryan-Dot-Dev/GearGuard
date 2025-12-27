import { Op } from "sequelize";
import { EquipmentStatus, TeamRole } from "../../common/enums.ts";
import { badRequest, forbidden, notFound } from "../../common/errors.ts";
import { Equipment } from "../../models/equipment.model.ts";
import { MaintenanceRequest } from "../../models/maintenance-request.model.ts";
import { MaintenanceTeam } from "../../models/maintenance-team.model.ts";
import { TeamMember } from "../../models/team-member.model.ts";

export interface CreateEquipmentInput {
	name: string;
	serialNumber: string;
	owner: string;
	location: string;
	maintenanceTeamId: string;
	defaultTechnicianId: string;
}

export interface UpdateEquipmentInput extends Partial<CreateEquipmentInput> {
	status?: EquipmentStatus;
}

export class EquipmentService {
	static async create(payload: CreateEquipmentInput, actor: TeamMember) {
		if (actor.role !== TeamRole.Manager || actor.teamId !== payload.maintenanceTeamId) {
			throw forbidden("Only managers of the equipment team can create equipment");
		}

		const team = await MaintenanceTeam.findByPk(payload.maintenanceTeamId, {
			include: [TeamMember]
		});
		if (!team) {
			throw notFound("Maintenance team not found");
		}

		const technician = await TeamMember.findByPk(payload.defaultTechnicianId);
		if (!technician || technician.teamId !== payload.maintenanceTeamId) {
			throw badRequest("Default technician must belong to the equipment team");
		}

		const existingSerial = await Equipment.findOne({ where: { serialNumber: payload.serialNumber } });
		if (existingSerial) {
			throw badRequest("Serial number already exists");
		}

		return Equipment.create(payload as any);
	}

	static async list() {
		return Equipment.findAll({
			include: [MaintenanceTeam, { model: TeamMember, as: "defaultTechnician" }]
		});
	}

	static async getById(id: string) {
		const equipment = await Equipment.findByPk(id, {
			include: [
				MaintenanceTeam,
				{ model: TeamMember, as: "defaultTechnician" },
				{ model: MaintenanceRequest }
			]
		});

		if (!equipment) {
			throw notFound("Equipment not found");
		}

		return equipment;
	}

	static async update(id: string, payload: UpdateEquipmentInput, actor: TeamMember) {
		const equipment = await Equipment.findByPk(id);
		if (!equipment) {
			throw notFound("Equipment not found");
		}

		if (actor.role !== TeamRole.Manager || actor.teamId !== equipment.maintenanceTeamId) {
			throw forbidden("Only managers of the equipment team can update equipment");
		}

		if (payload.serialNumber) {
			const exists = await Equipment.findOne({
				where: { serialNumber: payload.serialNumber, id: { [Op.ne]: id } }
			});
			if (exists) {
				throw badRequest("Serial number already exists");
			}
		}

		if (payload.maintenanceTeamId) {
			const newTeam = await MaintenanceTeam.findByPk(payload.maintenanceTeamId);
			if (!newTeam) {
				throw notFound("Maintenance team not found");
			}
			if (actor.teamId !== payload.maintenanceTeamId) {
				throw forbidden("Managers can move equipment only within their team");
			}
		}

		if (payload.defaultTechnicianId) {
			const technician = await TeamMember.findByPk(payload.defaultTechnicianId);
			if (!technician || technician.teamId !== (payload.maintenanceTeamId ?? equipment.maintenanceTeamId)) {
				throw badRequest("Default technician must belong to the equipment team");
			}
		} else if (payload.maintenanceTeamId) {
			const currentTech = await TeamMember.findByPk(equipment.defaultTechnicianId);
			if (!currentTech || currentTech.teamId !== payload.maintenanceTeamId) {
				throw badRequest("Equipment needs a default technician in the new team");
			}
		}

		await equipment.update(payload);
		return equipment.reload();
	}
}

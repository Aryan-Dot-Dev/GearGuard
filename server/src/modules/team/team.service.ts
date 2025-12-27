import { TeamRole } from "../../common/enums.ts";
import { badRequest, forbidden, notFound } from "../../common/errors.ts";
import { MaintenanceTeam } from "../../models/maintenance-team.model.ts";
import { TeamMember } from "../../models/team-member.model.ts";

export interface CreateTeamInput {
  name: string;
}

export interface AddMemberInput {
  teamId: string;
  userId: string;
  name: string;
  email?: string;
}

export class TeamService {
  static async create(payload: CreateTeamInput, actor: TeamMember) {
    if (actor.role !== TeamRole.Manager) {
      throw forbidden("Only managers can create teams");
    }

    const existing = await MaintenanceTeam.findOne({ where: { name: payload.name } });
    if (existing) {
      throw badRequest("Team name already exists");
    }
    return MaintenanceTeam.create(payload as any);
  }

  static async list() {
    return MaintenanceTeam.findAll({ include: [TeamMember] });
  }

  static async addMember(payload: AddMemberInput, actor: TeamMember) {
    if (actor.role !== TeamRole.Manager) {
      throw forbidden("Only managers can add members");
    }

    const team = await MaintenanceTeam.findByPk(payload.teamId);
    if (!team) {
      throw notFound("Team not found");
    }

    const duplicate = await TeamMember.findOne({
      where: { userId: payload.userId }
    });

    if (duplicate) {
      throw badRequest("User already exists in a team");
    }

    return TeamMember.create(payload as any);
  }

  static async members(teamId: string) {
    const team = await MaintenanceTeam.findByPk(teamId, { include: [TeamMember] });
    if (!team) {
      throw notFound("Team not found");
    }
    return team.members;
  }
}

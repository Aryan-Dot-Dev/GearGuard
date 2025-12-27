import { Sequelize } from "sequelize-typescript";
import { Equipment } from "../models/equipment.model";
import { MaintenanceRequest } from "../models/maintenance-request.model";
import { MaintenanceTeam } from "../models/maintenance-team.model";
import { TeamMember } from "../models/team-member.model";

export const sequelize = new Sequelize({
  dialect: "postgres",
  host: "localhost",
  database: "gearguard",
  username: "postgres",
  password: "password",
  models: [Equipment, MaintenanceRequest, MaintenanceTeam, TeamMember],
  logging: false
});

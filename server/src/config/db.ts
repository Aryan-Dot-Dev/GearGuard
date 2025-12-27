import dotenv from "dotenv";
import { Sequelize } from "sequelize-typescript";
import { Equipment } from "../models/equipment.model.ts";
import { MaintenanceRequest } from "../models/maintenance-request.model.ts";
import { MaintenanceTeam } from "../models/maintenance-team.model.ts";
import { TeamMember } from "../models/team-member.model.ts";

dotenv.config();

const {
  DB_HOST = "localhost",
  DB_PORT = "5432",
  DB_NAME = "gearguardian",
  DB_USER = "postgres",
  DB_PASSWORD = "password",
  DB_URL
} = process.env;

export const sequelize = DB_URL
  ? new Sequelize(DB_URL, {
      dialect: "postgres",
      models: [Equipment, MaintenanceRequest, MaintenanceTeam, TeamMember],
      logging: false
    })
  : new Sequelize({
      dialect: "postgres",
      host: DB_HOST,
      port: Number(DB_PORT),
      database: DB_NAME,
      username: DB_USER,
      password: DB_PASSWORD,
      models: [Equipment, MaintenanceRequest, MaintenanceTeam, TeamMember],
      logging: false
    });

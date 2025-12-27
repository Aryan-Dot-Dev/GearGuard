import "reflect-metadata";
import dotenv from "dotenv";
import { RequestState, RequestType, TeamRole } from "./common/enums.ts";
import { sequelize } from "./config/db.ts";
import { Equipment } from "./models/equipment.model.ts";
import { MaintenanceRequest } from "./models/maintenance-request.model.ts";
import { MaintenanceTeam } from "./models/maintenance-team.model.ts";
import { TeamMember } from "./models/team-member.model.ts";

dotenv.config();

const now = Date.now();
const inOneDay = new Date(now + 24 * 60 * 60 * 1000);
const inSevenDays = new Date(now + 7 * 24 * 60 * 60 * 1000);

const run = async () => {
  // Resets and seeds the demo database; do not run in production.
  await sequelize.sync({ force: true });

    const mechanics = await MaintenanceTeam.create({ name: "Mechanics" } as any);
    const electricians = await MaintenanceTeam.create({ name: "Electricians" } as any);

  const alex = await TeamMember.create({
    name: "Alex Mechanic",
    userId: "alex.mechanic",
    email: "alex@example.com",
    teamId: mechanics.id,
    role: TeamRole.Manager
  } as any);

  const sam = await TeamMember.create({
    name: "Sam Spark",
    userId: "sam.spark",
    email: "sam@example.com",
    teamId: electricians.id
  } as any);

  const forklift = await Equipment.create({
    name: "Forklift A",
    serialNumber: "FL-001",
    owner: "Warehouse",
    location: "Bay 1",
    maintenanceTeamId: mechanics.id,
    defaultTechnicianId: alex.id
  } as any);

  const conveyor = await Equipment.create({
    name: "Conveyor B",
    serialNumber: "CV-010",
    owner: "Assembly",
    location: "Line 2",
    maintenanceTeamId: electricians.id,
    defaultTechnicianId: sam.id
  } as any);

  await MaintenanceRequest.create({
    subject: "Hydraulic leak",
    description: "Small pool near the mast",
    type: RequestType.Corrective,
    state: RequestState.New,
    equipmentId: forklift.id,
    teamId: mechanics.id,
    technicianId: alex.id,
    dueDate: inOneDay
  } as any);

  await MaintenanceRequest.create({
    subject: "Quarterly safety check",
    description: "Preventive inspection",
    type: RequestType.Preventive,
    state: RequestState.InProgress,
    equipmentId: conveyor.id,
    teamId: electricians.id,
    technicianId: sam.id,
    scheduledDate: new Date(),
    dueDate: inSevenDays
  } as any);

  console.log("Seeded demo data for GearGuard");
  await sequelize.close();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

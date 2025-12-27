import { BelongsTo, Column, ForeignKey, Model, Table } from "../../node_modules/sequelize-typescript/dist/index";
import { MaintenanceTeam } from "./maintenance-team.model";

@Table
export class TeamMember extends Model {
  @Column userId!: string;

  @ForeignKey(() => MaintenanceTeam)
  @Column teamId!: string;

  @BelongsTo(() => MaintenanceTeam)
  team!: MaintenanceTeam;
}

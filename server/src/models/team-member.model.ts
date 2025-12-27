import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  IsUUID,
  Model,
  PrimaryKey,
  Table
} from "sequelize-typescript";
import { TeamRole } from "../common/enums.ts";
import { MaintenanceRequest } from "./maintenance-request.model.ts";
import { MaintenanceTeam } from "./maintenance-team.model.ts";

@Table({ tableName: "team_members", timestamps: true })
export class TeamMember extends Model<TeamMember> {
  @PrimaryKey
  @IsUUID(4)
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({ allowNull: false, type: DataType.STRING })
  declare name: string;

  @Column({ allowNull: false, unique: true, type: DataType.STRING })
  declare userId: string;

  @Column({
    allowNull: false,
    type: DataType.ENUM(...Object.values(TeamRole) as string[]),
    defaultValue: TeamRole.Technician
  })
  declare role: TeamRole;

  @Column({ allowNull: true, unique: true, type: DataType.STRING })
  declare email?: string;

  @ForeignKey(() => MaintenanceTeam)
  @Column({ allowNull: false, type: DataType.UUID })
  declare teamId: string;

  @BelongsTo(() => MaintenanceTeam)
  team!: MaintenanceTeam;

  @HasMany(() => MaintenanceRequest, {
    foreignKey: "technicianId",
    as: "assignedRequests"
  })
  assignedRequests!: MaintenanceRequest[];
}

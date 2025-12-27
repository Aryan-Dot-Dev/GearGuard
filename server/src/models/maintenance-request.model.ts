import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  IsUUID,
  Model,
  PrimaryKey,
  Table
} from "sequelize-typescript";
import { RequestState, RequestType } from "../common/enums.ts";
import { Equipment } from "./equipment.model.ts";
import { MaintenanceTeam } from "./maintenance-team.model.ts";
import { TeamMember } from "./team-member.model.ts";

@Table({ tableName: "maintenance_requests", timestamps: true })
export class MaintenanceRequest extends Model<MaintenanceRequest> {
  @PrimaryKey
  @IsUUID(4)
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({ allowNull: false, type: DataType.STRING })
  declare subject: string;

  @Column({ allowNull: true, type: DataType.TEXT })
  declare description?: string;

  @Column({
    allowNull: false,
    type: DataType.ENUM(...Object.values(RequestType) as string[])
  })
  declare type: RequestType;

  @Column({
    allowNull: false,
    type: DataType.ENUM(...Object.values(RequestState) as string[]),
    defaultValue: RequestState.New
  })
  declare state: RequestState;

  @ForeignKey(() => Equipment)
  @Column({ allowNull: false, type: DataType.UUID })
  declare equipmentId: string;

  @ForeignKey(() => MaintenanceTeam)
  @Column({ allowNull: false, type: DataType.UUID })
  declare teamId: string;

  @ForeignKey(() => TeamMember)
  @Column({ allowNull: false, type: DataType.UUID })
  declare technicianId: string;

  @Column({ allowNull: true, type: DataType.DATE })
  declare scheduledDate?: Date;

  @Column({ allowNull: true, type: DataType.FLOAT })
  declare durationHours?: number;

  @Column({ allowNull: true, type: DataType.DATE })
  declare dueDate?: Date;

  @BelongsTo(() => Equipment)
  equipment!: Equipment;

  @BelongsTo(() => MaintenanceTeam)
  team!: MaintenanceTeam;

  @BelongsTo(() => TeamMember, { foreignKey: "technicianId", as: "technician" })
  technician!: TeamMember;
}

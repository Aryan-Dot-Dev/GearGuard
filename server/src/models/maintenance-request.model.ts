import { BelongsTo, Column, DataType, ForeignKey, Table } from "../../node_modules/sequelize-typescript/dist/index";
import { RequestType } from "../common/enums";
import { Equipment } from "./equipment.model";

@Table
export class MaintenanceRequest extends Model {
  @Column subject!: string;

  @Column(DataType.ENUM(...Object.values(RequestType)))
  type!: RequestType;

  @Column(DataType.ENUM(...Object.values(RequestState)))
  state!: RequestState;

  @ForeignKey(() => Equipment)
  @Column equipmentId!: string;

  @Column teamId!: string;
  @Column technicianId!: string;

  @Column scheduledDate?: Date;
  @Column durationHours?: number;
  @Column dueDate?: Date;

  @BelongsTo(() => Equipment)
  equipment!: Equipment;
}

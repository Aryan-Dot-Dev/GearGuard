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
import { EquipmentStatus } from "../common/enums.ts";
import { MaintenanceRequest } from "./maintenance-request.model.ts";
import { MaintenanceTeam } from "./maintenance-team.model.ts";
import { TeamMember } from "./team-member.model.ts";

@Table({ tableName: "equipment", timestamps: true })
export class Equipment extends Model<Equipment> {
    @PrimaryKey
    @IsUUID(4)
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id: string;

    @Column({ allowNull: false, type: DataType.STRING })
    declare name: string;

    @Column({ allowNull: false, unique: true, type: DataType.STRING })
    declare serialNumber: string;

    @Column({ allowNull: false, type: DataType.STRING })
    declare owner: string;

    @Column({ allowNull: false, type: DataType.STRING })
    declare location: string;

    @ForeignKey(() => MaintenanceTeam)
    @Column({ allowNull: false, type: DataType.UUID })
    declare maintenanceTeamId: string;

    @ForeignKey(() => TeamMember)
    @Column({ allowNull: false, type: DataType.UUID })
    declare defaultTechnicianId: string;

    @Column({
        allowNull: false,
        type: DataType.ENUM(...Object.values(EquipmentStatus) as string[]),
        defaultValue: EquipmentStatus.Active
    })
    declare status: EquipmentStatus;

    @BelongsTo(() => MaintenanceTeam)
    maintenanceTeam!: MaintenanceTeam;

    @BelongsTo(() => TeamMember, { foreignKey: "defaultTechnicianId", as: "defaultTechnician" })
    defaultTechnician!: TeamMember;

    @HasMany(() => MaintenanceRequest)
    maintenanceRequests!: MaintenanceRequest[];
}
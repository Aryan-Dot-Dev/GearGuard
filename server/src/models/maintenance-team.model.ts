import {
	Column,
	DataType,
	Default,
	HasMany,
	IsUUID,
	Model,
	PrimaryKey,
	Table
} from "sequelize-typescript";
import { Equipment } from "./equipment.model.ts";
import { TeamMember } from "./team-member.model.ts";

@Table({ tableName: "maintenance_teams", timestamps: true })
export class MaintenanceTeam extends Model<MaintenanceTeam> {
	@PrimaryKey
	@IsUUID(4)
	@Default(DataType.UUIDV4)
	@Column(DataType.UUID)
	declare id: string;

	@Column({ allowNull: false, unique: true, type: DataType.STRING })
	declare name: string;

	@HasMany(() => TeamMember)
	members!: TeamMember[];

	@HasMany(() => Equipment)
	equipment!: Equipment[];
}

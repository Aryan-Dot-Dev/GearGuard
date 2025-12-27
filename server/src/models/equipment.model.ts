import { Column, Model, Table } from "../../node_modules/sequelize-typescript/dist/index";

@Table
export class Equipment extends Model {
    @Column name!: string;
    
}
import { column } from '@ioc:Adonis/Lucid/Orm'
import BaseModel from '../../src/Resource/Model'

export default class ShinyThingModel extends BaseModel {
	public static table = 'shiny_things'

	@column()
	public name!: string

	@column()
	public price!: number

	@column()
	public coin!: string

	@column()
	public color!: number

	@column()
	public shininess!: number

}
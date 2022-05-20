import { column } from '@ioc:Adonis/Lucid/Orm'
import BaseModel from '../../src/Resource/Model'

export default class ParticleModel extends BaseModel {
	public static table = 'particles'

	@column()
	public color!: number

}
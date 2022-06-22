import { $ } from '../../src/Resource';
import ParticleModel from './ParticleModel';

const i = $.InputProp
const o = $.Prop<ParticleModel>()

export class $Particle extends $.Schema({

    Model: ParticleModel,
    Alias: 'Partícula',

    Output: {
        color: o('color').int
    },

    States: {
        created: 'Criado',
        purged:  'Expurgado',
        deleted: 'Excluído'
    },

    Transitions: {

        create: $.Transition('Criar',{
            from: 'void',
            to: 'created',
            input: {
                color:          i('Cor').int,
                shiny_thing_id: i('ID da Coisa Brilhante').int.protected()
            },
            fn: async (obj: ParticleModel, input) => {
                obj.color = input.color;
                //obj.shiny_thing_id = input.shiny_thing_id;
            },
        }),

        purge: $.Transition('Expurgar',{
            from: 'created',
            to: 'purged',
            input: {},
            fn: async(obj: ParticleModel) =>{ 
                obj.color = 0;
            }
        }),

        delete: $.Transition('Deletar',{
            from: ['created','purged'],
            to: 'deleted',
            input: {}
        })

    }
}){}

type Particle = $.Type<$Particle>;
const Particle = new $.Machine<Particle, $Particle>($Particle.$);

export default Particle;
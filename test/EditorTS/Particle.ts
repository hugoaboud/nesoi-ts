import { $, Type } from '../../src/Resource';
import ParticleModel from './ParticleModel';

const i = $.InputProp
const o = $.Prop<ParticleModel>()

class $Particle extends $.Schema({

    Model: ParticleModel,

    Output: {
        color: o('color').int
    },

    States: {
        created: 'Criado',
        purged:  'Expurgado',
        deleted: 'Excluído'
    },

    Transitions: {

        create: $.Transition({
            alias: 'Criar',
            from: 'void',
            to: 'created',
            input: {
                color: i('Cor').int
            },
            fn: async (obj: ParticleModel, input) => {
                obj.color = input.color;
            },
        }),

        purge: $.Transition({
            alias: 'Quebrar',
            from: 'created',
            to: 'purged',
            input: {},
            fn: async(obj: ParticleModel) =>{ 
                obj.color = 0;
            }
        }),

        delete: $.Transition({
            alias: 'Deletar',
            from: '*',
            to: 'deleted',
            input: {
                color: i('Cor').string
            }
        })

    }
}){}

type Particle = Type<$Particle>;
const Particle = new $.Machine.Resource<Particle, $Particle>($Particle.$);
export default Particle;
import { Schema, Prop, InputProp, Transition, Type, Resource } from '../../src';
import ParticleModel from './ParticleModel';

const _ = Prop<ParticleModel>()
const $ = InputProp
const S = Schema({

    Model: ParticleModel,

    Output: {
        color: _('color').int
    },

    States: {
        created:  { alias: 'Criado' },
        purged:   { alias: 'Expurgado' },
        deleted:  { alias: 'Excluído' }
    },

    Transitions: {

        create: Transition({
            alias: 'Criar',
            from: 'void',
            to: 'created',
            input: {
                color:      $('Cor').int
            },
            fn: async (obj: ParticleModel, input) => {
                obj.color = input.color;
            },
        }),

        purge: Transition({
            alias: 'Quebrar',
            from: 'created',
            to: 'purged',
            input: {},
            fn: async(obj: ParticleModel) =>{ 
                obj.color = 0;
            }
        }),

        delete: Transition({
            alias: 'Deletar',
            from: '*',
            to: 'deleted',
            input: {
                color: $('Cor').string
            }
        })

    }
})

type S = typeof S;
export interface $Particle extends S {}
type Particle = Type<typeof S>;
const Particle = new Resource<Particle, $Particle>(S);
export default Particle;
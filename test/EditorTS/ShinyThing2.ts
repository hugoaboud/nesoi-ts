import * as R from '../../src/Resource/index';
import ShinyThingModel from './ShinyThingModel';

const i = R.InputProp
const o = R.Prop<ShinyThingModel>()

class $ShinyThing extends R.Schema({

    Model: ShinyThingModel,

    Output: {
        name:           o('name').string,
        price:          o('price').money,
        decoration: {
            color:      o('color').int,
            shininess:  o('shininess').decimal
        }
    },

    States: {
        created: 'Criada',
        broken:  'Quebrada',
        deleted: 'Excluída'
    },

    Transitions: {

        create: R.Transition({
            alias: 'Criar',
            from: 'void',
            to: 'created',
            input: {
                name:           i('Nome').string.noDuplicate('code'),
                price:          i('Preço').float.optional(0),
                decoration:     i('Decoração').object({
                    color:      i('Cor').enum(['red','blue','green'] as const),
                    shininess:  i('Brilhância').float
                }).optional({
                    color: 'red',
                    shininess: 0.3
                })
            },
            fn: async (obj: ShinyThingModel, input) => {
                obj.name = input.name;
                obj.price = input.price!;                
                obj.color = {
                    'red': 1,
                    'blue': 2,
                    'green': 3
                }[input.decoration!.color];
                obj.shininess = input.decoration!.shininess;
            },
        }),

        break: R.Transition({
            alias: 'Quebrar',
            from: 'created',
            to: 'broken',
            input: {
                nada: i('Nada').int
                //particle: $('Partícula').child(Particle, 'create')
            },
            fn: async (obj: ShinyThingModel, input) => {
                
            }
        })

    }
}){}

type ShinyThing = R.Type<$ShinyThing>;
const ShinyThing = new R.Machine<ShinyThing, $ShinyThing>($ShinyThing.$);
export default ShinyThing;
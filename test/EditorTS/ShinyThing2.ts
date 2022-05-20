import { $, Type } from '../../src/Resource';
import ShinyThingModel from './ShinyThingModel';

const i = $.InputProp
const o = $.Prop<ShinyThingModel>()

class $ShinyThing extends $.Schema({

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

        create: $.Transition({
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

        break: $.Transition({
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

    },

    Hooks: [
        {
            on: 'enter',
            state: 'broken',
            fn: async (obj: ShinyThingModel, client, run) => {
                
            }
        }
    ]
}){}

type ShinyThing = Type<$ShinyThing>;
const ShinyThing = new $.Machine.Resource<ShinyThing, $ShinyThing>($ShinyThing.$);
export default ShinyThing;

let a = {} as ShinyThing;

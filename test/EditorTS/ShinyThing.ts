import { Schema, Prop, InputProp, Transition, Type, Resource } from '../../src';
import ShinyThingModel from './ShinyThingModel';

const _ = Prop<ShinyThingModel>()
const $ = InputProp
const S = Schema({

    Model: ShinyThingModel,

    Output: {
        name:           _('name').string,
        price:          _('price').money,
        decoration: {
            color:      _('color').int,
            shininess:  _('shininess').decimal
        }
    },

    States: {
        created:  { alias: 'Criado' },
        broken:   { alias: 'Quebrada' },
        deleted:  { alias: 'Excluído' }
    },

    Transitions: {

        create: Transition({
            alias: 'Criar',
            from: 'void',
            to: 'created',
            input: {
                name:           $('Nome').string.noDuplicate('code'),
                price:          $('Preço').float.optional(0),
                decoration:     $('Decoração').object({
                    color:      $('Cor').enum(['red','blue','green'] as const),
                    shininess:  $('Brilhância').float
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

        break: Transition({
            alias: 'Quebrar',
            from: 'created',
            to: 'broken',
            input: {}
        })

    }
})
type S = typeof S;
interface $ extends S {}

type ShinyThing = Type<typeof S>;
const ShinyThing = new Resource<ShinyThing, $>(S);
export default ShinyThing;
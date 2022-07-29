export function edit<Model, Input>(obj: Model, input: Input, key: keyof Model & keyof Input, on_undefined: 'keep'|'erase' = 'keep') {
    
    if (input[key] == undefined) {
        if (on_undefined === 'keep') return;
        obj[key] = null as any;
        return;
    }
    obj[key] = input[key] as any;

}
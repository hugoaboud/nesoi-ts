export function ReverseEnum(e: any) {
    let reverse = {} as Record<string,any>;
    Object.keys(e).forEach(k => {
        reverse[e[k]] = k;
    })
    return reverse;
}
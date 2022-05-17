export function Capitalize(str: string): string {
    return str[0].toUpperCase() + str.slice(1).toLowerCase();
}

export function Camelize(str: string): string {
    return str.split('_').map(s => s[0].toUpperCase() + s.slice(1).toLowerCase()).join('');
}

export function Plural(str: string): string {
    return str + 's';
}
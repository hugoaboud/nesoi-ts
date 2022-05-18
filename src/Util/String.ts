export function CamelToSnakeCase(camel: string) {
    return camel.split(/(?=[A-Z])/).join('_').toLowerCase();
}
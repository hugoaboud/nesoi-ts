import ShinyThing from "./ShinyThing";

async function main() {

    let ruby = await ShinyThing.create({
        name: 'ruby',
        price: undefined,
        decoration: undefined
    });

    await ruby.break({});

}    
main();
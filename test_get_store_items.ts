import { getStoreItems } from "./app/actions/store";

async function main() {
    const res = await getStoreItems({ limit: 5 });
    console.dir(res, { depth: null });
}
main();

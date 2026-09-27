import { register } from "node:module";

register(new URL("./ts-ext.mjs", import.meta.url), import.meta.url);

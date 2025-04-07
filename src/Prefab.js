export class Prefab {
    constructor(name, proto) {
        this.proto = proto;
        this.count = 0;
        this.name = name;
    }

    getPrefabInstance() {
        this.count++;
        return {
            proto: this.proto,
            name: this.name + this.count
        }
    }
}
const extender = (...parts) => parts.reduce(creator, BaseAnimal);


module.exports = { extender };
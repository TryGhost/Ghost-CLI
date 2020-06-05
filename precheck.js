if (!process.argv[2]) {
    console.error('Usage: %s %s moduleA,moduleB', process.argv[0], process.argv[1]);
    process.exit(1);
}

const dependencies = process.argv[2].toLowerCase().split(',');

const result = {
    nodeVersion: process.version
};

for (const binaryDependency of dependencies) {
    result[binaryDependency] = {};
    try {
       require(binaryDependency);
       result[binaryDependency].success = true;
    } catch (error) {
       result[binaryDependency].success = false;
       result[binaryDependency].error = error.toString();
    }
}

process.stdout.write(JSON.stringify(result));

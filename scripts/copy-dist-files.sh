# Copy the modules and types over to dist/
cp compiled/src/index.js dist
cp compiled/src/types.d.ts dist


# Copy over the *.address.json files to dist/
cp -R src/addresses/*.addresses.json dist
cp src/addresses/AddressesJsonFile.ts dist/AddressesJsonFile.ts

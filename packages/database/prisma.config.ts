import {defineConfig} from 'prisma/config';

// Generation needs no database credentials. Runtime reads DATABASE_URL explicitly.
export default defineConfig({schema: 'prisma/schema.prisma'});

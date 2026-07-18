import { Prisma, RefType, StockTransactionType, UserRole } from '@prisma/client';

import { normalizeNumber } from '../src/lib/normalize';
import { prisma } from '../src/lib/prisma';

interface PartFitmentSpec {
  vehicleClassId: number;
  vehicleMakeId?: number;
  vehicleModelId?: number;
}

interface PartCrossReferenceSpec {
  refType: RefType;
  refNumber: string;
  refBrand?: string;
}

interface SupplierPartSpec {
  supplierId: number;
  supplierPartNumber: string;
  isPreferred: boolean;
}

interface PartSpec {
  sku: string;
  manufacturerId: number;
  manufacturerPartNumber: string;
  name: string;
  description: string;
  categoryId: number;
  unitOfMeasure?: string;
  mrp: number;
  fitments: PartFitmentSpec[];
  crossReferences: PartCrossReferenceSpec[];
  supplierParts: SupplierPartSpec[];
}

interface OpeningStockSpec {
  shopId: number;
  partSku: string;
  purchasedByUserId: number;
  quantity: number;
  reorderLevel: number;
  costPrice: number;
  sellingPrice: number;
  storageLocation: string;
}

async function main() {
  await prisma.$transaction(
    async (tx) => {
      // FK-safe delete order: children before parents, respecting every onDelete: Restrict relation
      await tx.stockTransaction.deleteMany();
      await tx.inventoryItem.deleteMany();
      await tx.supplierPart.deleteMany();
      await tx.partCrossReference.deleteMany();
      await tx.partFitment.deleteMany();
      await tx.user.deleteMany();
      await tx.part.deleteMany();
      await tx.vehicleModel.deleteMany();
      await tx.vehicleMake.deleteMany();
      await tx.vehicleClass.deleteMany();
      await tx.shop.deleteMany();
      await tx.category.deleteMany({ where: { parentCategoryId: { not: null } } });
      await tx.category.deleteMany({ where: { parentCategoryId: null } });
      await tx.manufacturer.deleteMany();
      await tx.supplier.deleteMany();

      const vehicleClasses = {
        tractor: await tx.vehicleClass.create({ data: { name: 'Tractor', displayOrder: 1 } }),
        passenger: await tx.vehicleClass.create({ data: { name: 'Passenger', displayOrder: 2 } }),
        twoWheeler: await tx.vehicleClass.create({ data: { name: '2-Wheeler', displayOrder: 3 } }),
      };

      const vehicleMakes = {
        mahindra: await tx.vehicleMake.create({ data: { name: 'Mahindra' } }),
        ford: await tx.vehicleMake.create({ data: { name: 'Ford' } }),
        swaraj: await tx.vehicleMake.create({ data: { name: 'Swaraj' } }),
        hero: await tx.vehicleMake.create({ data: { name: 'Hero' } }),
        marutiSuzuki: await tx.vehicleMake.create({ data: { name: 'Maruti Suzuki' } }),
        bajaj: await tx.vehicleMake.create({ data: { name: 'Bajaj' } }),
      };

      const vehicleModels = {
        mahindra575DI: await tx.vehicleModel.create({
          data: {
            name: 'Mahindra 575 DI',
            vehicleMakeId: vehicleMakes.mahindra.id,
            vehicleClassId: vehicleClasses.tractor.id,
          },
        }),
        mahindra475DI: await tx.vehicleModel.create({
          data: {
            name: 'Mahindra 475 DI',
            vehicleMakeId: vehicleMakes.mahindra.id,
            vehicleClassId: vehicleClasses.tractor.id,
          },
        }),
        ford3600: await tx.vehicleModel.create({
          data: {
            name: 'Ford 3600',
            vehicleMakeId: vehicleMakes.ford.id,
            vehicleClassId: vehicleClasses.tractor.id,
          },
        }),
        swaraj744FE: await tx.vehicleModel.create({
          data: {
            name: 'Swaraj 744 FE',
            vehicleMakeId: vehicleMakes.swaraj.id,
            vehicleClassId: vehicleClasses.tractor.id,
          },
        }),
        marutiSuzukiSwift: await tx.vehicleModel.create({
          data: {
            name: 'Maruti Suzuki Swift',
            vehicleMakeId: vehicleMakes.marutiSuzuki.id,
            vehicleClassId: vehicleClasses.passenger.id,
          },
        }),
        heroSplendorPlus: await tx.vehicleModel.create({
          data: {
            name: 'Hero Splendor Plus',
            vehicleMakeId: vehicleMakes.hero.id,
            vehicleClassId: vehicleClasses.twoWheeler.id,
          },
        }),
        bajajPulsar150: await tx.vehicleModel.create({
          data: {
            name: 'Bajaj Pulsar 150',
            vehicleMakeId: vehicleMakes.bajaj.id,
            vehicleClassId: vehicleClasses.twoWheeler.id,
          },
        }),
      };

      const manufacturers = {
        bosch: await tx.manufacturer.create({ data: { name: 'Bosch', code: 'BSH' } }),
        lucasTvs: await tx.manufacturer.create({ data: { name: 'Lucas TVS', code: 'LTV' } }),
        mico: await tx.manufacturer.create({ data: { name: 'MICO', code: 'MCO' } }),
        exide: await tx.manufacturer.create({ data: { name: 'Exide', code: 'EXD' } }),
        kAndN: await tx.manufacturer.create({ data: { name: 'K&N', code: 'KNN' } }),
      };

      const electrical = await tx.category.create({ data: { name: 'Electrical', displayOrder: 1 } });
      const engine = await tx.category.create({ data: { name: 'Engine', displayOrder: 2 } });
      const consumables = await tx.category.create({ data: { name: 'Consumables', displayOrder: 3 } });

      const categories = {
        starterMotors: await tx.category.create({
          data: { name: 'Starter Motors', parentCategoryId: electrical.id, displayOrder: 1 },
        }),
        batteries: await tx.category.create({
          data: { name: 'Batteries', parentCategoryId: electrical.id, displayOrder: 2 },
        }),
        lighting: await tx.category.create({
          data: { name: 'Lighting', parentCategoryId: electrical.id, displayOrder: 3 },
        }),
        filters: await tx.category.create({
          data: { name: 'Filters', parentCategoryId: engine.id, displayOrder: 1 },
        }),
        belts: await tx.category.create({
          data: { name: 'Belts', parentCategoryId: engine.id, displayOrder: 2 },
        }),
        greaseAndLubricants: await tx.category.create({
          data: { name: 'Grease & Lubricants', parentCategoryId: consumables.id, displayOrder: 1 },
        }),
      };

      const suppliers = {
        shreeBalaji: await tx.supplier.create({
          data: {
            name: 'Shree Balaji Auto Distributors Pvt Ltd',
            contactPerson: 'Rakesh Sharma',
            phone: '+91 98765 43210',
            email: 'sales@shreebalajiauto.in',
            address: 'Plot 14, Industrial Area Phase 2, Chandigarh 160002',
            gstin: '03AAFCS1234M1Z6',
          },
        }),
        nationalAutoSpares: await tx.supplier.create({
          data: {
            name: 'National Auto Spares Corporation',
            contactPerson: 'Anil Deshmukh',
            phone: '+91 98220 11223',
            email: 'orders@nationalautospares.in',
            address: 'MIDC Industrial Estate, Nashik, Maharashtra 422101',
            gstin: '27AABCN5678Q1Z2',
          },
        }),
      };

      const partSpecs: PartSpec[] = [
        {
          sku: 'STM-BSH-575DI',
          manufacturerId: manufacturers.bosch.id,
          manufacturerPartNumber: '0-001-367-032',
          name: 'Starter Motor - Mahindra 575 DI',
          description: '12V starter motor for Mahindra 575 DI tractor engines.',
          categoryId: categories.starterMotors.id,
          mrp: 4200,
          fitments: [{ vehicleClassId: vehicleClasses.tractor.id, vehicleModelId: vehicleModels.mahindra575DI.id }],
          crossReferences: [
            { refType: RefType.OEM, refNumber: 'MHD-STR-575DI-OE', refBrand: 'Mahindra' },
            { refType: RefType.COMPETITOR, refNumber: 'LTV-ST-5750', refBrand: 'Lucas TVS' },
          ],
          supplierParts: [
            { supplierId: suppliers.shreeBalaji.id, supplierPartNumber: 'SBD-STM-5750', isPreferred: true },
            { supplierId: suppliers.nationalAutoSpares.id, supplierPartNumber: 'NAS-STM-5750', isPreferred: false },
          ],
        },
        {
          sku: 'STM-LTV-475DI',
          manufacturerId: manufacturers.lucasTvs.id,
          manufacturerPartNumber: '3M-4750-01',
          name: 'Starter Motor - Mahindra 475 DI',
          description: '12V starter motor for Mahindra 475 DI tractor engines.',
          categoryId: categories.starterMotors.id,
          mrp: 3900,
          fitments: [{ vehicleClassId: vehicleClasses.tractor.id, vehicleModelId: vehicleModels.mahindra475DI.id }],
          crossReferences: [
            { refType: RefType.OEM, refNumber: 'MHD-STR-475DI-OE', refBrand: 'Mahindra' },
            { refType: RefType.COMPETITOR, refNumber: 'BSH-ST-4750', refBrand: 'Bosch' },
          ],
          supplierParts: [
            { supplierId: suppliers.shreeBalaji.id, supplierPartNumber: 'SBD-STM-4750', isPreferred: true },
          ],
        },
        {
          sku: 'BAT-EXD-88AH',
          manufacturerId: manufacturers.exide.id,
          manufacturerPartNumber: 'EX-88AH-MH',
          name: 'Battery 12V 88Ah - Mahindra Tractor Range',
          description: 'Maintenance-free 12V 88Ah battery fitting the full Mahindra tractor range.',
          categoryId: categories.batteries.id,
          mrp: 6800,
          fitments: [{ vehicleClassId: vehicleClasses.tractor.id, vehicleMakeId: vehicleMakes.mahindra.id }],
          crossReferences: [
            { refType: RefType.OEM, refNumber: 'MHD-BAT-88AH-OE', refBrand: 'Mahindra' },
            { refType: RefType.COMPETITOR, refNumber: 'AMR-88AH', refBrand: 'Amaron' },
          ],
          supplierParts: [
            { supplierId: suppliers.nationalAutoSpares.id, supplierPartNumber: 'NAS-BAT-88AH', isPreferred: true },
            { supplierId: suppliers.shreeBalaji.id, supplierPartNumber: 'SBD-BAT-88AH', isPreferred: false },
          ],
        },
        {
          sku: 'BAT-EXD-09AH',
          manufacturerId: manufacturers.exide.id,
          manufacturerPartNumber: 'EX-9AH-BJ',
          name: 'Battery 12V 9Ah - Bajaj Two-Wheeler Range',
          description: 'Sealed 12V 9Ah battery fitting the full Bajaj two-wheeler range.',
          categoryId: categories.batteries.id,
          mrp: 2000,
          fitments: [{ vehicleClassId: vehicleClasses.twoWheeler.id, vehicleMakeId: vehicleMakes.bajaj.id }],
          crossReferences: [{ refType: RefType.OEM, refNumber: 'BJP-BAT-9AH-OE', refBrand: 'Bajaj' }],
          supplierParts: [
            { supplierId: suppliers.nationalAutoSpares.id, supplierPartNumber: 'NAS-BAT-9AH', isPreferred: true },
          ],
        },
        {
          sku: 'HLB-LTV-TRC',
          manufacturerId: manufacturers.lucasTvs.id,
          manufacturerPartNumber: 'LTV-3535-12V',
          name: 'Headlamp Bulb 12V 35/35W - Tractor',
          description: 'Twin-filament headlamp bulb fitting any tractor in the catalog.',
          categoryId: categories.lighting.id,
          mrp: 220,
          fitments: [{ vehicleClassId: vehicleClasses.tractor.id }],
          crossReferences: [
            { refType: RefType.OEM, refNumber: 'TRAC-HLB-3535-OE' },
            { refType: RefType.ALTERNATE, refNumber: 'PHIL-3535-ALT', refBrand: 'Philips' },
          ],
          supplierParts: [
            { supplierId: suppliers.shreeBalaji.id, supplierPartNumber: 'SBD-HLB-TRC', isPreferred: true },
          ],
        },
        {
          sku: 'HLB-BSH-2W',
          manufacturerId: manufacturers.bosch.id,
          manufacturerPartNumber: 'BSH-H4-12V',
          name: 'Headlamp Bulb 12V H4 - Two-Wheeler',
          description: 'H4 halogen headlamp bulb fitting any two-wheeler in the catalog.',
          categoryId: categories.lighting.id,
          mrp: 180,
          fitments: [{ vehicleClassId: vehicleClasses.twoWheeler.id }],
          crossReferences: [
            { refType: RefType.OEM, refNumber: '2W-HLB-H4-OE' },
            { refType: RefType.SUPERSEDES, refNumber: 'BSH-H4-12V-OLD', refBrand: 'Bosch' },
          ],
          supplierParts: [
            { supplierId: suppliers.shreeBalaji.id, supplierPartNumber: 'SBD-HLB-2W', isPreferred: true },
            { supplierId: suppliers.nationalAutoSpares.id, supplierPartNumber: 'NAS-HLB-2W', isPreferred: false },
          ],
        },
        {
          sku: 'AFL-KNN-TRC',
          manufacturerId: manufacturers.kAndN.id,
          manufacturerPartNumber: 'KN-AF-TRC1',
          name: 'Air Filter Element - Tractor',
          description: 'Panel air filter element fitting any tractor in the catalog.',
          categoryId: categories.filters.id,
          mrp: 550,
          fitments: [{ vehicleClassId: vehicleClasses.tractor.id }],
          crossReferences: [
            { refType: RefType.OEM, refNumber: 'TRAC-AFL-STD-OE' },
            { refType: RefType.COMPETITOR, refNumber: 'MANN-AF-TRC', refBrand: 'Mann Filter' },
          ],
          supplierParts: [
            { supplierId: suppliers.nationalAutoSpares.id, supplierPartNumber: 'NAS-AFL-TRC', isPreferred: true },
          ],
        },
        {
          sku: 'FBL-MCO-FRD',
          manufacturerId: manufacturers.mico.id,
          manufacturerPartNumber: 'MCO-FB-100',
          name: 'Fan Belt - Ford Tractor Engine',
          description: 'Engine fan belt fitting the full Ford tractor range.',
          categoryId: categories.belts.id,
          mrp: 450,
          fitments: [{ vehicleClassId: vehicleClasses.tractor.id, vehicleMakeId: vehicleMakes.ford.id }],
          crossReferences: [{ refType: RefType.OEM, refNumber: 'FRD-FBL-3600-OE', refBrand: 'Ford' }],
          supplierParts: [
            { supplierId: suppliers.shreeBalaji.id, supplierPartNumber: 'SBD-FBL-FRD', isPreferred: true },
          ],
        },
        {
          sku: 'GRS-MCO-LI500',
          manufacturerId: manufacturers.mico.id,
          manufacturerPartNumber: 'MCO-GR-LI500',
          name: 'Lithium Complex Grease 500g',
          description: 'Multipurpose lithium complex grease, suitable across all vehicle classes.',
          categoryId: categories.greaseAndLubricants.id,
          unitOfMeasure: 'tub',
          mrp: 280,
          fitments: [],
          crossReferences: [],
          supplierParts: [
            { supplierId: suppliers.nationalAutoSpares.id, supplierPartNumber: 'NAS-GRS-LI500', isPreferred: true },
          ],
        },
        {
          sku: 'HLB-LTV-SWFT',
          manufacturerId: manufacturers.lucasTvs.id,
          manufacturerPartNumber: 'LTV-H4-SWFT',
          name: 'Headlamp Bulb H4 - Maruti Suzuki Swift',
          description: 'H4 halogen headlamp bulb for the Maruti Suzuki Swift.',
          categoryId: categories.lighting.id,
          mrp: 240,
          fitments: [
            { vehicleClassId: vehicleClasses.passenger.id, vehicleModelId: vehicleModels.marutiSuzukiSwift.id },
          ],
          crossReferences: [
            { refType: RefType.OEM, refNumber: 'MSZ-HLB-SWFT-OE', refBrand: 'Maruti Suzuki' },
            { refType: RefType.COMPETITOR, refNumber: 'PHIL-H4-SWFT', refBrand: 'Philips' },
          ],
          supplierParts: [
            { supplierId: suppliers.shreeBalaji.id, supplierPartNumber: 'SBD-HLB-SWFT', isPreferred: true },
            { supplierId: suppliers.nationalAutoSpares.id, supplierPartNumber: 'NAS-HLB-SWFT', isPreferred: false },
          ],
        },
      ];

      const partIdBySku: Record<string, number> = {};

      for (const spec of partSpecs) {
        const part = await tx.part.create({
          data: {
            sku: spec.sku,
            skuNormalized: normalizeNumber(spec.sku),
            manufacturerId: spec.manufacturerId,
            manufacturerPartNumber: spec.manufacturerPartNumber,
            mpnNormalized: normalizeNumber(spec.manufacturerPartNumber),
            name: spec.name,
            description: spec.description,
            categoryId: spec.categoryId,
            unitOfMeasure: spec.unitOfMeasure,
            mrp: spec.mrp,
          },
        });
        partIdBySku[spec.sku] = part.id;

        if (spec.fitments.length > 0) {
          await tx.partFitment.createMany({
            data: spec.fitments.map((fitment) => ({ partId: part.id, ...fitment })),
          });
        }

        if (spec.crossReferences.length > 0) {
          await tx.partCrossReference.createMany({
            data: spec.crossReferences.map((ref) => ({
              partId: part.id,
              refType: ref.refType,
              refNumber: ref.refNumber,
              refNumberNormalized: normalizeNumber(ref.refNumber),
              refBrand: ref.refBrand,
            })),
          });
        }

        if (spec.supplierParts.length > 0) {
          await tx.supplierPart.createMany({
            data: spec.supplierParts.map((supplierPart) => ({
              partId: part.id,
              supplierId: supplierPart.supplierId,
              supplierPartNumber: supplierPart.supplierPartNumber,
              supplierPartNumberNormalized: normalizeNumber(supplierPart.supplierPartNumber),
              isPreferred: supplierPart.isPreferred,
            })),
          });
        }
      }

      const shops = {
        main: await tx.shop.create({
          data: {
            name: 'Arya Auto Parts – Main',
            address: '12 MG Road, Nashik, Maharashtra 422001',
            phone: '+91 253 234 5678',
            gstin: '27AABCA1111A1Z9',
          },
        }),
        highway: await tx.shop.create({
          data: {
            name: 'Arya Auto Parts – Highway',
            address: 'Mumbai-Agra Highway (NH-3), Nashik, Maharashtra 422010',
            phone: '+91 253 234 9012',
            gstin: '27AABCA2222A1Z8',
          },
        }),
      };

      const users = {
        mainOwner: await tx.user.create({
          data: {
            shopId: shops.main.id,
            name: 'Suresh Arya',
            phone: '+91 98765 11111',
            email: 'suresh.arya@aryaautoparts.in',
            role: UserRole.OWNER,
          },
        }),
        mainStaff: await tx.user.create({
          data: {
            shopId: shops.main.id,
            name: 'Ramesh Kumar',
            phone: '+91 98765 22222',
            email: 'ramesh.kumar@aryaautoparts.in',
            role: UserRole.STAFF,
          },
        }),
        highwayOwner: await tx.user.create({
          data: {
            shopId: shops.highway.id,
            name: 'Meena Arya',
            phone: '+91 98765 33333',
            email: 'meena.arya@aryaautoparts.in',
            role: UserRole.OWNER,
          },
        }),
        highwayStaff: await tx.user.create({
          data: {
            shopId: shops.highway.id,
            name: 'Sanjay Patil',
            phone: '+91 98765 44444',
            email: 'sanjay.patil@aryaautoparts.in',
            role: UserRole.STAFF,
          },
        }),
      };

      const openingStock: OpeningStockSpec[] = [
        {
          shopId: shops.main.id,
          partSku: 'STM-BSH-575DI',
          purchasedByUserId: users.mainOwner.id,
          quantity: 6,
          reorderLevel: 3,
          costPrice: 3200,
          sellingPrice: 3850,
          storageLocation: 'Rack A1',
        },
        {
          shopId: shops.main.id,
          partSku: 'STM-LTV-475DI',
          purchasedByUserId: users.mainOwner.id,
          quantity: 2,
          reorderLevel: 5,
          costPrice: 2950,
          sellingPrice: 3550,
          storageLocation: 'Rack A2',
        },
        {
          shopId: shops.main.id,
          partSku: 'BAT-EXD-88AH',
          purchasedByUserId: users.mainOwner.id,
          quantity: 10,
          reorderLevel: 4,
          costPrice: 5200,
          sellingPrice: 6200,
          storageLocation: 'Rack B1',
        },
        {
          shopId: shops.main.id,
          partSku: 'BAT-EXD-09AH',
          purchasedByUserId: users.mainOwner.id,
          quantity: 15,
          reorderLevel: 5,
          costPrice: 1450,
          sellingPrice: 1800,
          storageLocation: 'Rack B2',
        },
        {
          shopId: shops.main.id,
          partSku: 'HLB-LTV-TRC',
          purchasedByUserId: users.mainOwner.id,
          quantity: 25,
          reorderLevel: 10,
          costPrice: 120,
          sellingPrice: 180,
          storageLocation: 'Bin C1',
        },
        {
          shopId: shops.main.id,
          partSku: 'HLB-BSH-2W',
          purchasedByUserId: users.mainOwner.id,
          quantity: 30,
          reorderLevel: 12,
          costPrice: 90,
          sellingPrice: 150,
          storageLocation: 'Bin C2',
        },
        {
          shopId: shops.main.id,
          partSku: 'AFL-KNN-TRC',
          purchasedByUserId: users.mainOwner.id,
          quantity: 18,
          reorderLevel: 6,
          costPrice: 350,
          sellingPrice: 480,
          storageLocation: 'Rack D1',
        },
        {
          shopId: shops.main.id,
          partSku: 'GRS-MCO-LI500',
          purchasedByUserId: users.mainOwner.id,
          quantity: 40,
          reorderLevel: 15,
          costPrice: 180,
          sellingPrice: 250,
          storageLocation: 'Bin E1',
        },
        {
          shopId: shops.highway.id,
          partSku: 'STM-BSH-575DI',
          purchasedByUserId: users.highwayOwner.id,
          quantity: 4,
          reorderLevel: 3,
          costPrice: 3250,
          sellingPrice: 3900,
          storageLocation: 'Rack A1',
        },
        {
          shopId: shops.highway.id,
          partSku: 'BAT-EXD-88AH',
          purchasedByUserId: users.highwayOwner.id,
          quantity: 6,
          reorderLevel: 4,
          costPrice: 5250,
          sellingPrice: 6250,
          storageLocation: 'Rack B1',
        },
        {
          shopId: shops.highway.id,
          partSku: 'HLB-BSH-2W',
          purchasedByUserId: users.highwayOwner.id,
          quantity: 20,
          reorderLevel: 10,
          costPrice: 95,
          sellingPrice: 155,
          storageLocation: 'Bin C1',
        },
        {
          shopId: shops.highway.id,
          partSku: 'HLB-LTV-SWFT',
          purchasedByUserId: users.highwayOwner.id,
          quantity: 1,
          reorderLevel: 4,
          costPrice: 140,
          sellingPrice: 210,
          storageLocation: 'Bin C2',
        },
      ];

      for (const stock of openingStock) {
        const partId = partIdBySku[stock.partSku];
        if (partId === undefined) {
          throw new Error(`openingStock references unknown SKU ${stock.partSku}`);
        }

        const inventoryItem = await tx.inventoryItem.create({
          data: {
            shopId: stock.shopId,
            partId,
            quantityOnHand: 0,
            reorderLevel: stock.reorderLevel,
            costPrice: stock.costPrice,
            sellingPrice: stock.sellingPrice,
            storageLocation: stock.storageLocation,
          },
        });

        await tx.stockTransaction.create({
          data: {
            shopId: stock.shopId,
            partId,
            userId: stock.purchasedByUserId,
            type: StockTransactionType.PURCHASE,
            quantity: stock.quantity,
            unitPrice: stock.costPrice,
          },
        });

        await tx.inventoryItem.update({
          where: { id: inventoryItem.id },
          data: { quantityOnHand: stock.quantity },
        });
      }
    },
    { timeout: 30000 },
  );

  const inventoryItems = await prisma.inventoryItem.findMany();
  const purchasedSums = await prisma.stockTransaction.groupBy({
    by: ['shopId', 'partId'],
    where: { type: StockTransactionType.PURCHASE },
    _sum: { quantity: true },
  });
  const purchasedSumByKey = new Map(
    purchasedSums.map((row) => [`${row.shopId}-${row.partId}`, row._sum.quantity ?? new Prisma.Decimal(0)]),
  );

  const ledgerMismatches = inventoryItems.filter((item) => {
    const purchasedSum = purchasedSumByKey.get(`${item.shopId}-${item.partId}`) ?? new Prisma.Decimal(0);
    return !item.quantityOnHand.equals(purchasedSum);
  });

  if (ledgerMismatches.length > 0) {
    throw new Error(
      `Ledger invariant FAILED for ${ledgerMismatches.length} inventory item(s): ${JSON.stringify(ledgerMismatches)}`,
    );
  }

  const [
    vehicleClassCount,
    vehicleMakeCount,
    vehicleModelCount,
    manufacturerCount,
    categoryCount,
    supplierCount,
    partCount,
    crossReferenceCount,
    supplierPartCount,
    shopCount,
    userCount,
    inventoryItemCount,
    stockTransactionCount,
  ] = await Promise.all([
    prisma.vehicleClass.count(),
    prisma.vehicleMake.count(),
    prisma.vehicleModel.count(),
    prisma.manufacturer.count(),
    prisma.category.count(),
    prisma.supplier.count(),
    prisma.part.count(),
    prisma.partCrossReference.count(),
    prisma.supplierPart.count(),
    prisma.shop.count(),
    prisma.user.count(),
    prisma.inventoryItem.count(),
    prisma.stockTransaction.count(),
  ]);

  console.log(
    `Seed complete: vehicleClasses=${vehicleClassCount} vehicleMakes=${vehicleMakeCount} ` +
      `vehicleModels=${vehicleModelCount} manufacturers=${manufacturerCount} categories=${categoryCount} ` +
      `suppliers=${supplierCount} parts=${partCount} crossReferences=${crossReferenceCount} ` +
      `supplierParts=${supplierPartCount} shops=${shopCount} users=${userCount} ` +
      `inventoryItems=${inventoryItemCount} stockTransactions=${stockTransactionCount}. ` +
      `Ledger invariant OK for ${inventoryItems.length} item(s).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

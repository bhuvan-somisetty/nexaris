import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

describe('SearchService', () => {
  let service: SearchService;
  let prisma: PrismaService;
  let redis: RedisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: PrismaService,
          useValue: {
            searchSynonym: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
            searchHistory: {
              findMany: jest.fn(),
              delete: jest.fn(),
            },
            searchQueryLog: {
              groupBy: jest.fn(),
              create: jest.fn(),
            },
            product: {
              findMany: jest.fn(),
            },
            userActivity: {
              count: jest.fn(),
              create: jest.fn(),
            },
            orderItem: {
              count: jest.fn(),
            },
            userPreferenceProfile: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('expandQueryWithSynonyms', () => {
    it('should expand word with synonyms correctly', async () => {
      jest.spyOn(prisma.searchSynonym, 'findMany').mockResolvedValue([
        {
          id: '1',
          word: 'iphone',
          synonyms: ['apple phone'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.expandQueryWithSynonyms('iphone');
      expect(result).toBe('((iphone) | (apple & phone))');
    });

    it('should return term unmodified if no synonyms found', async () => {
      jest.spyOn(prisma.searchSynonym, 'findMany').mockResolvedValue([]);

      const result = await service.expandQueryWithSynonyms('unknown');
      expect(result).toBe('unknown');
    });
  });

  describe('getAutocompleteSuggestions', () => {
    it('should return cached suggestions if available', async () => {
      jest.spyOn(redis, 'get').mockResolvedValue(['iPhone 15']);

      const result = await service.getAutocompleteSuggestions('iph');
      expect(result).toEqual(['iPhone 15']);
      expect(redis.get).toHaveBeenCalledWith('search:suggest:iph');
    });

    it('should fetch from database and cache on miss', async () => {
      jest.spyOn(redis, 'get').mockResolvedValue(null);
      jest
        .spyOn(prisma.product, 'findMany')
        .mockResolvedValue([{ name: 'iPhone 15 Pro' }] as any);

      const result = await service.getAutocompleteSuggestions('iph');
      expect(result).toEqual(['iPhone 15 Pro']);
      expect(prisma.product.findMany).toHaveBeenCalled();
      expect(redis.set).toHaveBeenCalledWith(
        'search:suggest:iph',
        ['iPhone 15 Pro'],
        3600,
      );
    });
  });
});

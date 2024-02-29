import * as pactum from 'pactum';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthDto } from '../src/auth/dto';

describe('App e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
      }),
    );
    await app.init();
    await app.listen(3333);

    prisma = app.get(PrismaService);
    await prisma.cleanDb();

    pactum.request.setBaseUrl('http://localhost:3333');
  });

  afterAll(() => {
    app.close();
  });

  describe('Auth', () => {
    const dto: AuthDto = {
      email: 'test@email.com',
      password: 'secret',
    };

    describe('Signup', () => {
      const SIGNUP_URL = '/auth/signup';

      it('should throw if email empty', () => {
        return pactum
          .spec()
          .post(SIGNUP_URL)
          .withBody({
            password: dto.password,
          })
          .expectStatus(400);
      });

      it('should throw if password empty', () => {
        return pactum
          .spec()
          .post(SIGNUP_URL)
          .withBody({
            email: dto.email,
          })
          .expectStatus(400);
      });

      it('should throw if no body provided', () => {
        return pactum.spec().post(SIGNUP_URL).expectStatus(400);
      });

      it('should signup', () => {
        return pactum.spec().post(SIGNUP_URL).withBody(dto).expectStatus(201);
      });

      it('should throw if duplicate email', () => {
        return pactum.spec().post(SIGNUP_URL).withBody(dto).expectStatus(403);
      });
    });

    describe('Signin', () => {
      const SIGNIN_URL = '/auth/signin';

      it('should throw if email empty', () => {
        return pactum
          .spec()
          .post(SIGNIN_URL)
          .withBody({
            password: dto.password,
          })
          .expectStatus(400);
      });

      it('should throw if password empty', () => {
        return pactum
          .spec()
          .post(SIGNIN_URL)
          .withBody({
            email: dto.email,
          })
          .expectStatus(400);
      });

      it('should throw if no body provided', () => {
        return pactum.spec().post(SIGNIN_URL).expectStatus(400);
      });

      it('should throw if invalid email', () => {
        return pactum
          .spec()
          .post(SIGNIN_URL)
          .withBody({
            email: 'other@email.com',
            password: dto.password,
          })
          .expectStatus(403);
      });

      it('should signin', () => {
        return pactum
          .spec()
          .post(SIGNIN_URL)
          .withBody(dto)
          .expectStatus(200)
          .stores('userAT', 'access_token');
      });
    });
  });

  describe('User', () => {
    describe('Get me', () => {
      it('should get current user', () => {
        return pactum
          .spec()
          .get('/users/me')
          .withHeaders({
            Authorization: 'Bearer $S{userAT}',
          })
          .expectStatus(200);
      });
    });

    describe('Edit user', () => {});
  });

  describe('Bookmark', () => {
    describe('Create bookmark', () => {});

    describe('Get bookmarks', () => {});

    describe('Get bookmark by id', () => {});

    describe('Edit bookmark by id', () => {});

    describe('Delete bookmark by id', () => {});
  });
});

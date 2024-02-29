import * as pactum from 'pactum';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthDto } from '../src/auth/dto';
import { EditUserDto } from 'src/user/dto';
import { CreateBookmarkDto, EditBookmarkDto } from 'src/bookmark/dto';

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
      const GET_ME_URL = '/users/me';

      it('should get current user', () => {
        return pactum
          .spec()
          .get(GET_ME_URL)
          .withHeaders({
            Authorization: 'Bearer $S{userAT}',
          })
          .expectStatus(200);
      });
    });

    describe('Edit user', () => {
      const EDIT_USER_URL = '/users';

      it('should edit user', () => {
        const dto: EditUserDto = {
          firstName: 'test1',
          email: 'test.edit@email.com',
        };

        return pactum
          .spec()
          .patch(EDIT_USER_URL)
          .withHeaders({
            Authorization: 'Bearer $S{userAT}',
          })
          .withBody(dto)
          .expectStatus(200)
          .expectBodyContains(dto.firstName)
          .expectBodyContains(dto.email);
      });
    });
  });

  describe('Bookmark', () => {
    const BOOKMARKS_URL = '/bookmarks';
    const BOOKMARKS_BY_ID_URL = '/bookmarks/{id}';

    describe('Get empty bookmarks', () => {
      it('should get bookmarks', () => {
        return pactum
          .spec()
          .get(BOOKMARKS_URL)
          .withHeaders({
            Authorization: 'Bearer $S{userAT}',
          })
          .expectStatus(200)
          .expectBody([]);
      });
    });

    describe('Create bookmark', () => {
      it('should create bookmarks', () => {
        const dto: CreateBookmarkDto = {
          title: 'First Bookmark',
          link: 'https://freecodecamp.org',
        };

        return pactum
          .spec()
          .post(BOOKMARKS_URL)
          .withHeaders({
            Authorization: 'Bearer $S{userAT}',
          })
          .withBody(dto)
          .expectStatus(201)
          .stores('bookmarkId', 'id');
      });
    });

    describe('Get bookmarks', () => {
      it('should get bookmarks', () => {
        return pactum
          .spec()
          .get(BOOKMARKS_URL)
          .withHeaders({
            Authorization: 'Bearer $S{userAT}',
          })
          .expectStatus(200)
          .expectJsonLength(1);
      });
    });

    describe('Get bookmark by id', () => {
      it('should get bookmark by id', () => {
        return pactum
          .spec()
          .get(BOOKMARKS_BY_ID_URL)
          .withPathParams('id', '$S{bookmarkId}')
          .withHeaders({
            Authorization: 'Bearer $S{userAT}',
          })
          .expectStatus(200)
          .expectBodyContains('$S{bookmarkId}');
      });
    });

    describe('Edit bookmark by id', () => {
      const dto: EditBookmarkDto = {
        title: 'Some title',
        description: 'Some description',
      };

      it('should edit bookmark by id', () => {
        return pactum
          .spec()
          .patch(BOOKMARKS_BY_ID_URL)
          .withPathParams('id', '$S{bookmarkId}')
          .withHeaders({
            Authorization: 'Bearer $S{userAT}',
          })
          .withBody(dto)
          .expectStatus(200)
          .expectBodyContains(dto.title)
          .expectBodyContains(dto.description);
      });
    });

    describe('Delete bookmark by id', () => {
      it('should delete bookmark by id', () => {
        return pactum
          .spec()
          .delete(BOOKMARKS_BY_ID_URL)
          .withPathParams('id', '$S{bookmarkId}')
          .withHeaders({
            Authorization: 'Bearer $S{userAT}',
          })
          .expectStatus(204);
      });

      it('should get empty bookmarks', () => {
        return pactum
          .spec()
          .get(BOOKMARKS_URL)
          .withHeaders({
            Authorization: 'Bearer $S{userAT}',
          })
          .expectStatus(200)
          .expectJsonLength(0);
      });
    });
  });
});

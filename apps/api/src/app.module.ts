import { Module } from "@nestjs/common";
import { AdminController } from "./controllers/admin.controller";
import { ContactController } from "./controllers/contact.controller";
import { AuthController } from "./controllers/auth.controller";
import { CatalogController } from "./controllers/catalog.controller";
import { FilesController } from "./controllers/files.controller";
import { JobsController } from "./controllers/jobs.controller";
import { OrdersController } from "./controllers/orders.controller";
import { PhotosController } from "./controllers/photos.controller";
import { StoreController } from "./controllers/store.controller";
import { StudioController } from "./controllers/studio.controller";
import { WebhooksController } from "./controllers/webhooks.controller";
import { AlbumsService } from "./services/albums.service";
import { AuthService } from "./services/auth.service";
import { CommerceService } from "./services/commerce.service";
import { MediaService } from "./services/media.service";
import { MessagingService } from "./services/messaging.service";
import { PaymentsService } from "./services/payments.service";
import { ProcessingService } from "./services/processing.service";
import { QueueService } from "./services/queue.service";
import { ScopeService } from "./services/scope.service";
import { ViewsService } from "./services/views.service";
import { MemoryRepository } from "./store/memory";
import { Repository } from "./store/repository";

@Module({
  controllers: [
    AuthController,
    StudioController,
    JobsController,
    PhotosController,
    CatalogController,
    OrdersController,
    StoreController,
    AdminController,
    ContactController,
    FilesController,
    WebhooksController,
  ],
  providers: [
    // Swap for a Prisma-backed implementation once PostgreSQL is provisioned.
    { provide: Repository, useClass: MemoryRepository },
    AlbumsService,
    AuthService,
    CommerceService,
    MediaService,
    MessagingService,
    PaymentsService,
    ProcessingService,
    QueueService,
    ScopeService,
    ViewsService,
  ],
})
export class AppModule {}

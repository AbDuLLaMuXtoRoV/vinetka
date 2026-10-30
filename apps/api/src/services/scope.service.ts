import { Injectable } from "@nestjs/common";
import type { Job, Match, Organization, PassOffer, PriceSheet, Promo, Studio, Subject } from "@snapbell/sdk";
import { notFound } from "../common/errors";
import { Repository, type OrderRow, type PhotoRow } from "../store/repository";
import { err } from "../i18n";

/** Studio-scoped lookups: anything outside the caller's studio is a 404, never a 403, so ids don't leak. */
@Injectable()
export class ScopeService {
  constructor(private readonly repo: Repository) {}

  job(studio: Studio, id: string): Job {
    const job = this.repo.jobs.get(id);
    if (!job || job.studioId !== studio.id) throw notFound(err().notFound.job);
    return job;
  }

  subject(studio: Studio, id: string): Subject {
    const subject = this.repo.subjects.get(id);
    if (!subject || this.repo.jobs.get(subject.jobId)?.studioId !== studio.id) throw notFound(err().notFound.subject);
    return subject;
  }

  photo(studio: Studio, id: string): PhotoRow {
    const photo = this.repo.photos.get(id);
    if (!photo || this.repo.jobs.get(photo.jobId)?.studioId !== studio.id) throw notFound(err().notFound.photo);
    return photo;
  }

  match(studio: Studio, id: string): Match {
    const match = this.repo.matches.get(id);
    if (!match || this.repo.jobs.get(match.jobId)?.studioId !== studio.id) throw notFound(err().notFound.match);
    return match;
  }

  organization(studio: Studio, id: string): Organization {
    const org = this.repo.organizations.get(id);
    if (!org || org.studioId !== studio.id) throw notFound(err().notFound.organization);
    return org;
  }

  priceSheet(studio: Studio, id: string): PriceSheet {
    const sheet = this.repo.priceSheets.get(id);
    if (!sheet || sheet.studioId !== studio.id) throw notFound(err().notFound.priceSheet);
    return sheet;
  }

  promo(studio: Studio, id: string): Promo {
    const promo = this.repo.promos.get(id);
    if (!promo || promo.studioId !== studio.id) throw notFound(err().notFound.promo);
    return promo;
  }

  passOffer(studio: Studio, id: string): PassOffer {
    const offer = this.repo.passOffers.get(id);
    if (!offer || offer.studioId !== studio.id) throw notFound(err().notFound.passOffer);
    return offer;
  }

  order(studio: Studio, id: string): OrderRow {
    const order = this.repo.orders.get(id);
    if (!order || order.studioId !== studio.id || order.paymentState !== "paid") throw notFound(err().notFound.order);
    return order;
  }
}

import { Body, Controller, Get, HttpCode, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import { parse } from "../common/validate";
import { v } from "../i18n";
import { AuthService } from "../services/auth.service";

const loginSchema = z.object({ email: z.string().min(3).max(200), password: z.string().min(1).max(200) });
const setupSchema = z.object({
  token: z.string().min(1).max(200),
  password: z.string().min(8, { error: () => v().minChars(8) }).max(200),
});
const channel = z.enum(["sms", "email"]);

/**
 * There is deliberately no sign-up route: studios and their owners are created
 * by Snapbell staff (POST /admin/studios) and owners finish through /auth/setup.
 */
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("login")
  @HttpCode(200)
  login(@Req() req: Request, @Body() body: unknown) {
    const input = parse(loginSchema, body);
    return this.auth.login(req, input.email, input.password);
  }

  @Get("setup/:token")
  setupInfo(@Param("token") token: string) {
    return this.auth.setupInfo(token);
  }

  @Post("setup")
  @HttpCode(200)
  completeSetup(@Req() req: Request, @Body() body: unknown) {
    const input = parse(setupSchema, body);
    return this.auth.completeSetup(req, input.token, input.password);
  }

  @Post("magic-link")
  @HttpCode(200)
  magicLink(@Body() body: unknown) {
    return this.auth.magicLink(parse(z.object({ email: z.string().min(3).max(200) }), body).email);
  }

  @Post("magic-link/redeem")
  @HttpCode(200)
  redeemMagicLink(@Body() body: unknown) {
    return this.auth.redeemMagicLink(parse(z.object({ token: z.string().min(1).max(200) }), body).token);
  }

  /** A signed-in parent moving from the main site to the shop (different domains). */
  @Post("parent-handoff")
  @HttpCode(200)
  parentHandoff(@Req() req: Request) {
    return this.auth.issueParentHandoff(req);
  }

  @Post("parent-handoff/redeem")
  @HttpCode(200)
  redeemParentHandoff(@Req() req: Request, @Body() body: unknown) {
    return this.auth.redeemParentHandoff(req, parse(z.object({ code: z.string().min(1).max(200) }), body).code);
  }

  @Post("otp/send")
  @HttpCode(200)
  sendOtp(@Req() req: Request, @Body() body: unknown) {
    const input = parse(
      z.object({ destination: z.string().min(3).max(200), channel, albumCode: z.string().max(20).optional() }),
      body,
    );
    return this.auth.sendOtp(req, input);
  }

  @Post("otp/verify")
  @HttpCode(200)
  verifyOtp(@Req() req: Request, @Body() body: unknown) {
    const input = parse(
      z.object({
        destination: z.string().min(3).max(200),
        code: z.string().min(4).max(12),
        // Optional: a plain sign-in omits it so earlier opt-ins are kept.
        consent: z.object({ smsUpdates: z.boolean(), marketing: z.boolean() }).optional(),
        name: z.string().trim().max(100).optional(),
      }),
      body,
    );
    return this.auth.verifyOtp(req, input);
  }

  @Get("me")
  me(@Req() req: Request) {
    return this.auth.me(req);
  }
}

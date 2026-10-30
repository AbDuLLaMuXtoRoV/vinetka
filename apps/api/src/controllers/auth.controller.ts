import { Body, Controller, Get, HttpCode, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import { parse } from "../common/validate";
import { v } from "../i18n";
import { AuthService } from "../services/auth.service";

const loginSchema = z.object({ email: z.string().min(3).max(200), password: z.string().min(1).max(200) });
const signupSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().max(200),
  password: z.string().min(8, { error: () => v().minChars(8) }).max(200),
  studioName: z.string().trim().min(1).max(100),
});
const channel = z.enum(["sms", "email"]);

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("login")
  @HttpCode(200)
  login(@Req() req: Request, @Body() body: unknown) {
    const input = parse(loginSchema, body);
    return this.auth.login(req, input.email, input.password);
  }

  @Post("signup")
  signup(@Body() body: unknown) {
    return this.auth.signup(parse(signupSchema, body));
  }

  @Post("handoff")
  @HttpCode(200)
  handoff(@Body() body: unknown) {
    return this.auth.redeem("handoff", parse(z.object({ code: z.string().min(1).max(200) }), body).code);
  }

  @Post("magic-link")
  @HttpCode(200)
  magicLink(@Body() body: unknown) {
    return this.auth.magicLink(parse(z.object({ email: z.string().min(3).max(200) }), body).email);
  }

  @Post("magic-link/redeem")
  @HttpCode(200)
  redeemMagicLink(@Body() body: unknown) {
    return this.auth.redeem("magic_link", parse(z.object({ token: z.string().min(1).max(200) }), body).token);
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
        consent: z.object({ smsUpdates: z.boolean(), marketing: z.boolean() }).default({ smsUpdates: false, marketing: false }),
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

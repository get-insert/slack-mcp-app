import { ISlackOAuthPort } from '../domain/ports/slack-oauth.js';
import { IInstallationRepo } from '../domain/repositories/installation.js';
import { Installation } from '../domain/entities/installation.js';

export class HandleOAuthUseCase {
  constructor(
    private oauthPort: ISlackOAuthPort,
    private repo: IInstallationRepo
  ) {}

  async execute(code: string): Promise<Installation> {
    const { installation } = await this.oauthPort.exchangeCode(code);
    await this.repo.save(installation);
    return installation;
  }
}

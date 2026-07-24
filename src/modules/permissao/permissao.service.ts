import { PermissaoRepository } from './permissao.repository';

export class PermissaoService {
  constructor(private readonly permissaoRepository: PermissaoRepository) {}

  listar() {
    return this.permissaoRepository.findAll();
  }
}

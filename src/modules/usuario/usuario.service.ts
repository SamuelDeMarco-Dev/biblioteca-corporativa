import bcrypt from 'bcryptjs';
import { PERMISSOES_PADRAO_USUARIO } from '../../constants/permissoes';
import { UsuarioRepository } from './usuario.repository';
import { CriarUsuarioInput, EditarUsuarioInput } from './usuario.schema';

export class UsuarioService {
  constructor(private readonly usuarioRepository: UsuarioRepository) {}

  async criar(dados: CriarUsuarioInput) {
    const senhaHash = await bcrypt.hash(dados.senha, 10);

    const permissoesConnect =
      dados.permissoesIds && dados.permissoesIds.length > 0
        ? dados.permissoesIds.map((id) => ({ id }))
        : dados.perfil === 'USUARIO'
          ? PERMISSOES_PADRAO_USUARIO.map((nome) => ({ nome }))
          : [];

    const usuario = await this.usuarioRepository.create({
      nome: dados.nome,
      email: dados.email,
      setor: dados.setor,
      cpf: dados.cpf,
      senhaHash,
      perfil: dados.perfil,
      permissoes: { connect: permissoesConnect },
    });

    const { senhaHash: _senhaHash, ...semSenha } = usuario;
    return semSenha;
  }

  listar() {
    return this.usuarioRepository.findAll();
  }

  async atualizarPermissoes(
    usuarioId: number,
    habilitar: number[] = [],
    desabilitar: number[] = [],
  ) {
    const usuario = await this.usuarioRepository.updatePermissoes(
      usuarioId,
      habilitar,
      desabilitar,
    );
    const { senhaHash: _senhaHash, ...semSenha } = usuario;
    return semSenha;
  }

  editar(id: number, dados: EditarUsuarioInput) {
    return this.usuarioRepository.update(id, dados);
  }

  possuiPermissao(usuarioId: number, permissao: string): Promise<boolean> {
    return this.usuarioRepository.existsPermissao(usuarioId, permissao);
  }
}

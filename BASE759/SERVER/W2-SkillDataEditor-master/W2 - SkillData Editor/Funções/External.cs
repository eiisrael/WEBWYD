using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace W2___SkillData_Editor.Funções
{
    class External : Structs
    {
        public static STRUCT_SKILLDATA g_pSkillData = new STRUCT_SKILLDATA();

        static public string[] Propriendades = { "Inexistente","Fogo","Gelo","Sagrado","Trovão","Desconhecido"};
        static public int Index = -1;
        static public int Version = 7559;
        static public string[]EffectsString = {
    "Nenhuma",
    "Lentidão",
    "Velocidade(+)",
    "Resistência(-)",
    "Ataque_Bônus",
    "Evasão(-)",
    "Proteção_Absoluta",
    "Velocidade(-)",
    "Jóia(s)",
    "Dano(+)",
    "Ataque(-)",
    "Escudo_Mágico",
    "Defesa(-)",
    "Assalto",
    "Possuído",
    "Técnica(+)",
    "Transformação",
    "Aura_da_Vida",
    "Controle_de_Mana",
    "Imunidade",
    "Veneno",
    "Meditação",
    "Trovão",
    "Aura_Bestial",
    "Samaritano",
    "Proteção_Elemental",
    "Evasão(+)",
    "Congelamento",
    "Invisibilidade",
    "Limite_da_Alma",
    "Bônus_PvM",
    "Escudo_Dourado",
    "Cancelamento",
    "Transformação",
    "Comida",
    "Bônus_HP/MP",
    "Veneno",
    "Ligação_Espectral",
    "Troca_de_Espírito",
    "Bônus_EXP",
    "Atordoado",
    "Esquiva(-)",
    "Magia_Misteriosa",
    "Anti_Magia",
    "Movimento_Zero",
    "Congelar",
    "Chama_Resistente",
    "Sangrar",
    "Última_Resistência",
    "Espelho_Mágico",
    "Proteção_Divina",
 
};
        static public string[] nSkillname =
        {
    "Proteção_Divina",
    "Bênção_Divina",
    "Lançar_Chamas",
    "Ataque_Aglomerado",
    "Mãos_Sangrentas",
    "Mestre_das_Armas",
    "Mestre_de_Esgrimas",
    "Tempestade_de_Vento",
    "Espelho_Mágico",
    "Conexão_de_Gelo",
    "Congelando_Counter",
    "Mestre_do_Selo",
    "Cenote",
    "Proteção_Absoluta",
    "Onda_de_Vida",
    "Poder_Sagrado",
    "Magia_Misteriosa",
    "Congelamento_Proficiente",
    "Força_do_Trovão",
    "Perdendo_o_Trovão",
    "Remover_Memória",
    "Incapacitador",
    "Maestria_em_Magia",
    "Outra_Mudança",
    "Anti_Magia",
    "Chama_Resistente",
    "Reduzir_Resistência(_Fogo_)",
    "Queima_de_Mana",
    "Unidade_Mental",
    "Invocação_Final",
    "Maestria_em_Evocação",
    "Armadura_de_Gelo",
    "Concha_Resistente",
    "Espinhos_Fortalecidos",
    "Poder_da_Arma",
    "Última_Resistência",
    "Contra_Ataque",
    "Ataque_Rápido_Proficiente",
    "Mestre_de_Habilidades",
    "Congelando",
    "Ponto_do_Mestre",
    "Absorção_de_Alma",
    "Ganho_e_Lucro",
    "Reforçar_a_Alma",
    "Tiro_Direto",
    "Garra_Habilidosa",
    "Sangramento",
    "Emboscada"
};
        static public string[] SkillName =
        {
    "Giro_da_Fúria","Toque_Sagrado","Golpe_Duplo","Samaritano","Fanatismo","Aura_da_Vida","Fúria_Divina",
    "Destino","Carga","Mestre_das_Armas","Golpe_Mortal","Assalto","Espada_da_Fênix","Possuído",
    "Noção_de_Combate","Armadura_Crítica","Perseguição","Espada_Flamejante","Contra_Ataque",
    "Lamina_Congelada","Ataque_da_Alma","Punhalada_Venenosa","Exterminar","Tempestade_de_Gelo",
    "Flecha_Mágica","Desintoxicar","Flash","Cura","Choque_Divino","Recuperar","Julgamento_Divino",
    "Renascimento","Ataque_de_Fogo","Relâmpago","Lança_de_Gelo","Tempestade_de_Meteoro","Nevasca",
    "Trovão","Fênix_de_Fogo","Inferno","Nevoa_Venenosa","Velocidade","Teleporte","Escudo_Mágico",
    "Arma_Mágica","Toque_da_Athena","Controle_de_Mana","Cancelamento","Fera_Flamejante","Chamas_Etéreas",
    "Som_das_Fadas","Enfraquecer","Fúria_de_Gaia","Proteção_Elemental","Força_Elemental","Espirito_Vingador",
    "Evocar_Condor","Evocar_Javali_Selvagem","Evocar_Lobo_Selvagem","Evocar_Urso_Selvagem","Evocar_Grande_Tigre",
    "Evocar_Gorila_Gigante","Evocar_Dragão_Negro","Evocar_Succubus","Lobisomem","Armadura_Elemental","Homem_Urso",
    "Escudo_do_Tormento","Astaroth","Metamorfose_Superior","Titã","Éden","Ataque_Fatal","Ilusão","Agressividade",
    "Encantar_Gelo","Imunidade","Meditação","Lança_de_Ferro","Tempestade_de_Raios","Golpe_Felino",
    "Ligação_Espectral","Perícia_de_Caçador","Extração","Alquimia","Escudo_Dourado","Explosão_Etérea",
    "Troca_de_Espírito","Lâmina_das_Sombras","Evasão_Aprimorada","Visão_de_Caçadora","Olhos_de_Aguia",
    "Toxina_de_Serpente","Lamina_Aérea","Proteção_das_Sombras","Invisibilidade","Poder_Superior",
    "Canhão_Guardião","Muro_de_Espinhos","Ressurreição","Concentração","Força_Espectral","Limite_da_Alma"
};
    }
}
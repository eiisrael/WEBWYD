using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using W2___SkillData_Editor.Funções;

namespace W2___SkillData_Editor
{
    public partial class Window : Form
    {
        public Window()
        {
            InitializeComponent();
            comboBox1.Items.Clear();
            comboBox2.Items.Clear();
            comboBox3.Items.Clear();
            comboBox4.Items.Clear();
            comboBox1.Text = "Selecione...";
            comboBox2.Text = "Selecione...";
            comboBox3.Text = "Selecione...";
            comboBox4.Text = "Selecione...";
            for (int i = 0; i < 5; i++)
            {
                comboBox1.Items.Add(External.Propriendades[i]);
                comboBox2.Items.Add(External.Propriendades[i]);
            }
            for (int i = 0; i < 51; i++)
            {
                comboBox3.Items.Add(External.EffectsString[i].Replace('_', ' '));
                comboBox4.Items.Add(External.EffectsString[i].Replace('_', ' '));
            }
            LinkLabel.Link link = new LinkLabel.Link();
            link.LinkData = "http://www.webcheats.com.br/members/seitbnao.4781487/";
            linkLabel1.Links.Add(link);
        }

        public void _Update()
        {
            SkillList.Items.Clear();
            ;

            if (!Functions.ReadSkillData())
                return;
            int LoopSize = 248;
            //if (External.Version == 7556)
            //    LoopSize = 103;


            for (int i = 0; i < LoopSize; i++)
            {

                if (i < 103)
                    SkillList.Items.Add("("+i+") " + External.SkillName[i].Replace('_', ' '));
                else if (i >= 200)
                    SkillList.Items.Add("(" + i + ") " + External.nSkillname[i - 200].Replace('_', ' '));
                else
                    SkillList.Items.Add(" - ");

            }
        }
        private void Carregar_Click(object sender, EventArgs e)
        {
            //if(!radioButton1.Checked && !radioButton1.Checked)
            //{
            //    MessageBox.Show("Selecione a versão!", "W2 - SkillData Editor",MessageBoxButtons.OKCancel, MessageBoxIcon.Asterisk);
            //    return;
            //}
            _Update();
        }

        private void Salvar_Click(object sender, EventArgs e)
        {
            //if (!radioButton1.Checked && !radioButton1.Checked)
            //{
            //    MessageBox.Show("Selecione a versão!", "W2 - SkillData Editor", MessageBoxButtons.OKCancel, MessageBoxIcon.Asterisk);
            //    return;
            //}
            if (SkillList.Items.Count > 1 && External.Index != -1)
            {
                GetValue();
                Functions.SaveFile<Structs.STRUCT_SKILLDATA>(External.g_pSkillData);
                _Update();
                MessageBox.Show("SkillData.bin salvo com sucesso", "W2 - SkillData Editor", MessageBoxButtons.OKCancel, MessageBoxIcon.Asterisk);
            }

        }

        private void SkillList_SelectedIndexChanged(object sender, EventArgs e)
        {
            External.Index = SkillList.SelectedIndex;
            SetValues();
        }

        public void SetValues()
        {
            int SkillID = External.Index;
            if (SkillID == -1)
                return;

            label17.Text = "" + SkillID;

            comboBox1.SelectedIndex = External.g_pSkillData.Skill[SkillID].InstanceAttribute;
            comboBox2.SelectedIndex = External.g_pSkillData.Skill[SkillID].AffectResist;
            comboBox3.SelectedIndex = External.g_pSkillData.Skill[SkillID].AffectType;
            comboBox4.SelectedIndex = External.g_pSkillData.Skill[SkillID].TickType;
            checkBox3.Checked = External.g_pSkillData.Skill[SkillID].UseOnMacro == 1;
            checkBox4.Checked = External.g_pSkillData.Skill[SkillID].PartyCheck == 1;
            checkBox1.Checked = External.g_pSkillData.Skill[SkillID].Passive == 1;
            checkBox2.Checked = External.g_pSkillData.Skill[SkillID].Aggressive == 1;
            textBox2.Text = "" + External.g_pSkillData.Skill[SkillID].AffectTime;
            textBox3.Text = "" + External.g_pSkillData.Skill[SkillID].AffectValue;
            textBox4.Text = "" + External.g_pSkillData.Skill[SkillID].TickValue;
            textBox7.Text = "" + External.g_pSkillData.Skill[SkillID].InstanceAttribute;
            textBox5.Text = "" + External.g_pSkillData.Skill[SkillID].MaxTarget;
            textBox8.Text = "" + External.g_pSkillData.Skill[SkillID].SkillPoint;
            textBox9.Text = "" + External.g_pSkillData.Skill[SkillID].Delay;
            textBox6.Text = "" + External.g_pSkillData.Skill[SkillID].Range;
            textBox1.Text = "" + External.g_pSkillData.Skill[SkillID].ManaSpent;
            textBox15.Text = "" + External.g_pSkillData.Skill[SkillID].ForceDamage;
            textBox10.Text = "";
            textBox11.Text = "";
            for (int i = 0; i < 8; i++)
            {
                textBox10.Text += External.g_pSkillData.Skill[SkillID].Act1[i] + " ";
                textBox11.Text += External.g_pSkillData.Skill[SkillID].Act2[i] + " ";
            }
            textBox12.Text = "" + External.g_pSkillData.Skill[SkillID].TargetType;
            textBox13.Text = "" + External.g_pSkillData.Skill[SkillID].InstanceType;
            textBox14.Text = "" + External.g_pSkillData.Skill[SkillID].InstanceValue;
        }
        public void GetValue()
        {
            int SkillID = External.Index;
            if (SkillID == -1)
                return;






            External.g_pSkillData.Skill[SkillID].ForceDamage = short.Parse(textBox15.Text);
            External.g_pSkillData.Skill[SkillID].UseOnMacro = (short)(checkBox3.Checked == false ? 0 : 1);
            External.g_pSkillData.Skill[SkillID].PartyCheck = checkBox4.Checked == false ? 0 : 1;
            External.g_pSkillData.Skill[SkillID].Passive = checkBox1.Checked == false ? 0 : 1;
            External.g_pSkillData.Skill[SkillID].Aggressive = checkBox2.Checked == false ? 0 : 1;
            External.g_pSkillData.Skill[SkillID].AffectTime = int.Parse(textBox2.Text);
            External.g_pSkillData.Skill[SkillID].AffectValue = int.Parse(textBox3.Text);
            External.g_pSkillData.Skill[SkillID].TickValue = int.Parse(textBox4.Text);
            External.g_pSkillData.Skill[SkillID].InstanceAttribute = int.Parse(textBox7.Text);
            External.g_pSkillData.Skill[SkillID].MaxTarget = int.Parse(textBox5.Text);
            External.g_pSkillData.Skill[SkillID].SkillPoint = int.Parse(textBox8.Text);
            External.g_pSkillData.Skill[SkillID].Delay = int.Parse(textBox9.Text);
            External.g_pSkillData.Skill[SkillID].Range = int.Parse(textBox6.Text);
            External.g_pSkillData.Skill[SkillID].ManaSpent = int.Parse(textBox1.Text);

            string[] Texter_1 = textBox10.Text.Split(new char[] { ' ' });
            string[] Texter_2 = textBox11.Text.Split(new char[] { ' ' });
            for (int i = 0; i < 8; i++)
            {

                External.g_pSkillData.Skill[SkillID].Act1[i] = byte.Parse(Texter_1[i]);
                External.g_pSkillData.Skill[SkillID].Act2[i] = byte.Parse(Texter_2[i]);
            }
            External.g_pSkillData.Skill[SkillID].TargetType = int.Parse(textBox12.Text);
            External.g_pSkillData.Skill[SkillID].InstanceType = int.Parse(textBox13.Text);
            External.g_pSkillData.Skill[SkillID].InstanceValue = int.Parse(textBox14.Text);
            External.g_pSkillData.Skill[SkillID].InstanceAttribute = comboBox1.SelectedIndex;
            External.g_pSkillData.Skill[SkillID].AffectResist = comboBox2.SelectedIndex;
            External.g_pSkillData.Skill[SkillID].AffectType = comboBox3.SelectedIndex;
            External.g_pSkillData.Skill[SkillID].TickType = comboBox4.SelectedIndex;
        }

        private void comboBox1_SelectedIndexChanged(object sender, EventArgs e)
        {
            int SkillID = External.Index;
            if (SkillID == -1 || comboBox1.SelectedIndex == -1)
                return;
            External.g_pSkillData.Skill[SkillID].InstanceAttribute = comboBox1.SelectedIndex;
        }

        private void comboBox2_SelectedIndexChanged(object sender, EventArgs e)
        {
            int SkillID = External.Index;
            if (SkillID == -1 || comboBox2.SelectedIndex == -1)
                return;
            External.g_pSkillData.Skill[SkillID].AffectResist = comboBox2.SelectedIndex;
        }

        private void comboBox3_SelectedIndexChanged(object sender, EventArgs e)
        {
            int SkillID = External.Index;
            if (SkillID == -1 || comboBox3.SelectedIndex == -1)
                return;
            External.g_pSkillData.Skill[SkillID].AffectType = comboBox3.SelectedIndex;
        }

        private void comboBox4_SelectedIndexChanged(object sender, EventArgs e)
        {
            int SkillID = External.Index;
            if (SkillID == -1 || comboBox4.SelectedIndex == -1)
                return;
            External.g_pSkillData.Skill[SkillID].TickType = comboBox4.SelectedIndex;
        }

        private void radioButton1_CheckedChanged(object sender, EventArgs e)
        {
            //External.Version = 7556;
        }

        private void radioButton2_CheckedChanged(object sender, EventArgs e)
        {
            //External.Version = 7559;

        }

        private void groupBox1_Enter(object sender, EventArgs e)
        {

        }

        private void button1_Click(object sender, EventArgs e)
        {

            int SkillID = External.Index;
            if (SkillID == -1 || comboBox4.SelectedIndex == -1)
                return;

            StreamWriter File = new StreamWriter("./SkillData.csv");

            string TxT = "";


            File.WriteLine("#by Seitbnao\n #SkillID,SkillPoint,TargetType,ManaSpent,Delay,Range,InstanceType,InstanceValue,TicktType,TicketValue,AffectType,AffectValue,AffectTime,Act[8],Act2[8],InstanceAtribute,TickAttribute,Agressive,Maxtarget,PatyCheck,Resist,PassiveCheck,MacroValue,SkillName\n");
            for (int i = 0; i < 248; i++)
            {
                TxT = "";
                string act1 = "", act2 = "", skillname = "";
                for (int x = 0; x < 8; x++)
                {
                    act1 += "." + External.g_pSkillData.Skill[i].Act1[x];
                    act2 += "." + External.g_pSkillData.Skill[i].Act2[x];
                }
                if (i < 103)
                    skillname = External.SkillName[i];
                else if (i >= 200)
                    skillname = External.nSkillname[i - 200];
                else
                    continue;

                
                TxT += i + "," + External.g_pSkillData.Skill[i].SkillPoint
                + "," + External.g_pSkillData.Skill[i].TargetType
                + "," + External.g_pSkillData.Skill[i].ManaSpent
                + "," + External.g_pSkillData.Skill[i].Delay
                + "," + External.g_pSkillData.Skill[i].Range
                + "," + External.g_pSkillData.Skill[i].InstanceType
                + "," + External.g_pSkillData.Skill[i].InstanceValue
                + "," + External.g_pSkillData.Skill[i].TickType
                + "," + External.g_pSkillData.Skill[i].TickValue
                + "," + External.g_pSkillData.Skill[i].AffectType
                + "," + External.g_pSkillData.Skill[i].AffectValue
                + "," + External.g_pSkillData.Skill[i].AffectTime
                + "," + act1
                + "," + act2
                 + "," + External.g_pSkillData.Skill[i].InstanceAttribute
                 + "," + External.g_pSkillData.Skill[i].TickAttribute
                 + "," + External.g_pSkillData.Skill[i].Aggressive
                 + "," + External.g_pSkillData.Skill[i].PartyCheck
                 + "," + External.g_pSkillData.Skill[i].AffectResist
                  + "," + External.g_pSkillData.Skill[i].Passive
                   + "," + External.g_pSkillData.Skill[i].ForceDamage
                   + "," + External.g_pSkillData.Skill[i].UseOnMacro
                   + "," + skillname + "";

                if (String.IsNullOrEmpty(skillname)) continue;
                File.WriteLine(TxT.Replace(",.",","));
            }
            File.Close();
            MessageBox.Show("SkillData.csv gerado com sucesso", "W2 - SkillData Editor", MessageBoxButtons.OKCancel, MessageBoxIcon.Asterisk);
        }

        private void linkLabel1_LinkClicked(object sender, LinkLabelLinkClickedEventArgs e)
        {
            Process.Start(e.Link.LinkData as string);
        }
    }
}
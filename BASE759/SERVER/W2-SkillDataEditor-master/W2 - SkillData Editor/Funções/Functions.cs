using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace W2___SkillData_Editor.Funções
{
    class Functions : Structs
    {
        public static BinaryType LoadFile<BinaryType>(byte[] rawData) where BinaryType : struct
        {
            var pinnedRawData = GCHandle.Alloc(rawData, GCHandleType.Pinned);
            try
            {
                var pinnedRawDataPtr = pinnedRawData.AddrOfPinnedObject();
                return (BinaryType)Marshal.PtrToStructure(pinnedRawDataPtr, typeof(BinaryType));
            }
            finally
            {
                pinnedRawData.Free();
            }
        }
        
        public static void SaveFile<BinaryType>(BinaryType SkillData)
        {
            try
            { 
                byte[] arr = new byte[Marshal.SizeOf(SkillData)];

                IntPtr ptr = Marshal.AllocHGlobal(Marshal.SizeOf(SkillData));
                Marshal.StructureToPtr(SkillData, ptr, false);
                Marshal.Copy(ptr, arr, 0, Marshal.SizeOf(SkillData));
                Marshal.FreeHGlobal(ptr);


                for (int i = 0; i < arr.Length; i++)
                    arr[i] ^= 0x5A;

                File.WriteAllBytes("SkillData.bin", arr);
            
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
            }
        }

        public static bool ReadSkillData()
        {
            try
            {
                Byte[] data;

                if (File.Exists("./SkillData.bin"))
                    data = File.ReadAllBytes("./SkillData.bin");
               else
                {
                    MessageBox.Show("SkillData não foi encontrado", "W2 - SkillData Editor", MessageBoxButtons.OKCancel, MessageBoxIcon.Asterisk);
                    return false;
                }

                for (int i = 0; i < data.Length; i++)
                    data[i] ^= 0x5A;

                External.g_pSkillData = LoadFile<STRUCT_SKILLDATA>(data);
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                return false;
            }
        }
    }
}


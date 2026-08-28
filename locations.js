const CAMPUS_LOCATIONS = [
  {
    id: "sysu-south",
    group: "中山大学",
    university: "中山大学",
    campus: "广州南校园",
    district: "海珠区·新港西路135号",
    city: "广州",
    code: "101280101",
    default: true
  },
  {
    id: "sysu-east",
    group: "中山大学",
    university: "中山大学",
    campus: "广州东校园",
    district: "番禺区·大学城外环东路132号",
    city: "番禺",
    code: "101280102"
  },
  {
    id: "sysu-north",
    group: "中山大学",
    university: "中山大学",
    campus: "广州北校园",
    district: "越秀区·中山二路74号",
    city: "广州",
    code: "101280101"
  },
  {
    id: "sysu-zhuhai",
    group: "中山大学",
    university: "中山大学",
    campus: "珠海校区",
    district: "香洲区·唐家湾",
    city: "珠海",
    code: "101280701"
  },
  {
    id: "sysu-shenzhen",
    group: "中山大学",
    university: "中山大学",
    campus: "深圳校区",
    district: "光明区·公常路66号",
    city: "深圳",
    code: "101280601"
  },
  {
    id: "scut-wushan",
    group: "广州高校",
    university: "华南理工大学",
    campus: "五山校区",
    district: "天河区·五山路381号",
    city: "广州",
    code: "101280101"
  },
  {
    id: "scut-uc",
    group: "广州高校",
    university: "华南理工大学",
    campus: "大学城校区",
    district: "番禺区·大学城外环东路382号",
    city: "番禺",
    code: "101280102"
  },
  {
    id: "jnu-shipai",
    group: "广州高校",
    university: "暨南大学",
    campus: "石牌校区",
    district: "天河区·黄埔大道西601号",
    city: "广州",
    code: "101280101"
  },
  {
    id: "jnu-panyu",
    group: "广州高校",
    university: "暨南大学",
    campus: "番禺校区",
    district: "番禺区·兴业大道东855号",
    city: "番禺",
    code: "101280102"
  },
  {
    id: "scnu-shipai",
    group: "广州高校",
    university: "华南师范大学",
    campus: "石牌校区",
    district: "天河区·中山大道西55号",
    city: "广州",
    code: "101280101"
  },
  {
    id: "scnu-uc",
    group: "广州高校",
    university: "华南师范大学",
    campus: "大学城校区",
    district: "番禺区·大学城外环西路378号",
    city: "番禺",
    code: "101280102"
  },
  {
    id: "gdut-uc",
    group: "广州高校",
    university: "广东工业大学",
    campus: "大学城校区",
    district: "番禺区·大学城外环西路100号",
    city: "番禺",
    code: "101280102"
  },
  {
    id: "gzu-uc",
    group: "广州高校",
    university: "广州大学",
    campus: "大学城校区",
    district: "番禺区·大学城外环西路230号",
    city: "番禺",
    code: "101280102"
  },
  {
    id: "gwdx-baiyun",
    group: "广州高校",
    university: "广东外语外贸大学",
    campus: "白云校区",
    district: "白云区·白云大道北2号",
    city: "广州",
    code: "101280101"
  },
  {
    id: "gzucm-uc",
    group: "广州高校",
    university: "广州中医药大学",
    campus: "大学城校区",
    district: "番禺区·大学城外环东路232号",
    city: "番禺",
    code: "101280102"
  },
  {
    id: "gzhmu-panyu",
    group: "广州高校",
    university: "广州医科大学",
    campus: "番禺校区",
    district: "番禺区·新造镇新造路1号",
    city: "番禺",
    code: "101280102"
  },
  {
    id: "gdpu-uc",
    group: "广州高校",
    university: "广东药科大学",
    campus: "大学城校区",
    district: "番禺区·大学城外环东路280号",
    city: "番禺",
    code: "101280102"
  },
  {
    id: "gdufe-haizhu",
    group: "广州高校",
    university: "广东财经大学",
    campus: "海珠校区",
    district: "海珠区·赤沙路21号",
    city: "广州",
    code: "101280101"
  },
  {
    id: "smu-baiyun",
    group: "广州高校",
    university: "南方医科大学",
    campus: "广州校区",
    district: "白云区·沙太南路1023号",
    city: "广州",
    code: "101280101"
  },
  {
    id: "xhyy-uc",
    group: "广州高校",
    university: "星海音乐学院",
    campus: "大学城校区",
    district: "番禺区·大学城外环西路398号",
    city: "番禺",
    code: "101280102"
  },
  {
    id: "gafa-uc",
    group: "广州高校",
    university: "广州美术学院",
    campus: "大学城校区",
    district: "番禺区·大学城外环西路168号",
    city: "番禺",
    code: "101280102"
  },
  {
    id: "gpn-baiyun",
    group: "广州高校",
    university: "广东警官学院",
    campus: "白云校区",
    district: "白云区·文盛庄路118号",
    city: "广州",
    code: "101280101"
  },
  {
    id: "szu-yuehai",
    group: "深圳高校",
    university: "深圳大学",
    campus: "粤海校区",
    district: "南山区·南海大道3688号",
    city: "深圳",
    code: "101280601"
  },
  {
    id: "sustech",
    group: "深圳高校",
    university: "南方科技大学",
    campus: "南山校区",
    district: "南山区·学苑大道1088号",
    city: "深圳",
    code: "101280601"
  },
  {
    id: "hitsz",
    group: "深圳高校",
    university: "哈尔滨工业大学（深圳）",
    campus: "南山校区",
    district: "南山区·平山一路6号",
    city: "深圳",
    code: "101280601"
  },
  {
    id: "cuhksz",
    group: "深圳高校",
    university: "香港中文大学（深圳）",
    campus: "龙岗校区",
    district: "龙岗区·龙翔大道2001号",
    city: "深圳",
    code: "101280601"
  },
  {
    id: "szpu",
    group: "深圳高校",
    university: "深圳职业技术大学",
    campus: "留仙洞校区",
    district: "南山区·留仙大道7098号",
    city: "深圳",
    code: "101280601"
  },
  {
    id: "bnu-zhuhai",
    group: "珠海高校",
    university: "北京师范大学珠海校区",
    campus: "香洲校区",
    district: "香洲区·金凤路18号",
    city: "珠海",
    code: "101280701"
  },
  {
    id: "jnu-zhuhai",
    group: "珠海高校",
    university: "暨南大学珠海校区",
    campus: "香洲校区",
    district: "香洲区·前山路206号",
    city: "珠海",
    code: "101280701"
  },
  {
    id: "zcst-jinwan",
    group: "珠海高校",
    university: "珠海科技学院",
    campus: "金湾校区",
    district: "金湾区·草堂湾",
    city: "金湾",
    code: "101280703"
  },
  {
    id: "stu-shantou",
    group: "其他城市高校",
    university: "汕头大学",
    campus: "校本部",
    district: "金平区·大学路243号",
    city: "汕头",
    code: "101280501"
  },
  {
    id: "gdou-zhanjiang",
    group: "其他城市高校",
    university: "广东海洋大学",
    campus: "湖光校区",
    district: "麻章区·海大路1号",
    city: "麻章",
    code: "101281010"
  },
  {
    id: "wyu-jiangmen",
    group: "其他城市高校",
    university: "五邑大学",
    campus: "蓬江校区",
    district: "蓬江区·东成村22号",
    city: "蓬江",
    code: "101281107"
  },
  {
    id: "dgut-songshanhu",
    group: "其他城市高校",
    university: "东莞理工学院",
    campus: "松山湖校区",
    district: "松山湖·大学路1号",
    city: "东莞",
    code: "101281601"
  },
  {
    id: "fosu-xianxi",
    group: "其他城市高校",
    university: "佛山大学",
    campus: "仙溪校区",
    district: "南海区·狮山镇仙溪水库西",
    city: "南海",
    code: "101280803"
  },
  {
    id: "hzu-huizhou",
    group: "其他城市高校",
    university: "惠州学院",
    campus: "校本部",
    district: "惠城区·演达大道46号",
    city: "惠州",
    code: "101280301"
  },
  {
    id: "gshpa-maoming",
    group: "其他城市高校",
    university: "广东石油化工学院",
    campus: "官渡校区",
    district: "茂南区·官渡二路139号",
    city: "茂名",
    code: "101282001"
  },
  {
    id: "sgu-shaoguan",
    group: "其他城市高校",
    university: "韶关学院",
    campus: "校本部",
    district: "浈江区·大学路288号",
    city: "韶关",
    code: "101280201"
  },
  {
    id: "hstc-chaozhou",
    group: "其他城市高校",
    university: "韩山师范学院",
    campus: "校本部",
    district: "湘桥区·桥东街道",
    city: "潮州",
    code: "101281501"
  },
  {
    id: "jyu-meizhou",
    group: "其他城市高校",
    university: "嘉应学院",
    campus: "校本部",
    district: "梅江区·月梅路",
    city: "梅州",
    code: "101280401"
  },
  {
    id: "lingnan-zhanjiang",
    group: "其他城市高校",
    university: "岭南师范学院",
    campus: "校本部",
    district: "赤坎区·寸金路29号",
    city: "赤坎",
    code: "101281006"
  },
  {
    id: "zqu-zhaoqing",
    group: "其他城市高校",
    university: "肇庆学院",
    campus: "校本部",
    district: "端州区·肇庆大道",
    city: "肇庆",
    code: "101280901"
  },
  {
    id: "gdou-yangjiang",
    group: "其他城市高校",
    university: "广东海洋大学",
    campus: "阳江校区",
    district: "江城区·白沙街道",
    city: "阳江",
    code: "101281801"
  }
];

// 坐标来源：OpenStreetMap/Photon 逐校区核验（WGS-84）后转为 GCJ-02；
// 华师大学城、广东药科大学城在 OSM 未收录，保留校区级近似值。
const CAMPUS_COORDS = {
  "sysu-south": [23.095264314434292, 113.30130574756747],
  "sysu-east": [23.066613, 113.390095],
  "sysu-north": [23.128292, 113.290079],
  "sysu-zhuhai": [22.347967, 113.591497],
  "sysu-shenzhen": [22.8003, 113.952608],
  "scut-wushan": [23.157786, 113.342694],
  "scut-uc": [23.047491, 113.405975],
  "jnu-shipai": [23.130928, 113.348278],
  "jnu-panyu": [23.016966, 113.415561],
  "scnu-shipai": [23.138894, 113.352209],
  "scnu-uc": [23.053474, 113.399519],
  "gdut-uc": [23.039198, 113.392874],
  "gzu-uc": [23.042156, 113.368663],
  "gwdx-baiyun": [23.200967, 113.291416],
  "gzucm-uc": [23.059356, 113.40587],
  "gzhmu-panyu": [23.041777, 113.426038],
  "gdpu-uc": [23.047473, 113.40752],
  "gdufe-haizhu": [23.09084, 113.353551],
  "smu-baiyun": [23.187376, 113.335064],
  "xhyy-uc": [23.057579, 113.380578],
  "gafa-uc": [23.037232, 113.382963],
  "gpn-baiyun": [23.254004, 113.3066],
  "szu-yuehai": [22.532868, 113.93634],
  "sustech": [22.600733, 114.00184],
  "hitsz": [22.58654, 113.970627],
  "cuhksz": [22.688259, 114.21226],
  "szpu": [22.584865, 113.937969],
  "bnu-zhuhai": [22.349603, 113.537372],
  "jnu-zhuhai": [22.249793, 113.534915],
  "zcst-jinwan": [22.0507, 113.40415],
  "stu-shantou": [23.413588, 116.633428],
  "gdou-zhanjiang": [21.150276, 110.301204],
  "wyu-jiangmen": [22.594939, 113.084125],
  "dgut-songshanhu": [22.903133, 113.874737],
  "fosu-xianxi": [23.140054, 113.054003],
  "hzu-huizhou": [23.037812, 114.418454],
  "gshpa-maoming": [21.679274, 110.922264],
  "sgu-shaoguan": [24.774455, 113.66854],
  "hstc-chaozhou": [23.658715, 116.662759],
  "jyu-meizhou": [24.327825, 116.130151],
  "lingnan-zhanjiang": [21.269063, 110.346865],
  "zqu-zhaoqing": [23.108047, 112.494018],
  "gdou-yangjiang": [21.878345, 111.826791]
};

for (const loc of CAMPUS_LOCATIONS) {
  const c = CAMPUS_COORDS[loc.id];
  if (c) {
    loc.lat = c[0];
    loc.lng = c[1];
  }
}

if (typeof window !== "undefined") {
  window.CAMPUS_LOCATIONS = CAMPUS_LOCATIONS;
  window.DEFAULT_CAMPUS_ID = "sysu-south";
}
if (typeof module !== "undefined") {
  module.exports = { locations: CAMPUS_LOCATIONS, defaultCampusId: "sysu-south" };
}

// 单位生命值
const Jafish = 20

// 单位属性
const C = {
  HP: 1, // 单位血量
  atk: 0, // 单位攻击力
  atkDistance: 0, // 单位攻击距离 0 -> 无攻击或被动攻击，  > 0 -> 主动攻击 ， 弓手攻击距离：趁弓手不注意时距离为2，否则为3
  maxAtkDistance: 0, // 最大攻击距离
}
const S = {
  HP: 24,
  atk: 3,
  atkDistance: 0,
  maxAtkDistance: 0,
}
const a = {
  HP: 7,
  atk: 3,
  atkDistance: 2,
  maxAtkDistance: 3,
}
const w = {
  HP: 3,
  atk: 11,
  atkDistance: 2,
  maxAtkDistance: 3,
}

// 攻击数值
const atk_0 = 0
const atk_3 = 3
const atk_5 = 5

// 计算安全血量，向后攻击，攻击力为3
const ceil = value => Math.ceil(value)
const integer = value => value | 0
const calculateHealth = (HP, atk) => 1 + integer(HP / atk_5) * atk
const calculateBackHealth = (HP, atk) => 1 + integer(HP / atk_3) * atk

const _units = [
  // { // 单位列表
  //   target: a, // 单位编号
  //   inversion: false, // 当前单位是否反向
  //   rely: 0, // 当前单位与上一个单位的距离
  // }, 
  {
    target: a,
    inversion: true,
    rely: 0,
  }, {
    target: S,
    inversion: false,
    rely: 0,
  }, {
    target: w,
    inversion: false,
    rely: 2,
  }, {
    target: C,
    inversion: false,
    rely: 1,
  }, {
    target: C,
    inversion: false,
    rely: 9,
  }
]

const __units = _units.map(item => {
  let {target, ...unit} = item

  unit = Object.assign(unit, target)
  unit.health = calculateHealth(unit.HP, unit.atk) // 对于该单位的安全血量
  unit.backHealth = calculateBackHealth(unit.HP, unit.atk) // 反向攻击的安全血量
  unit.defeatCount = unit.atkDistance > 0 ? ceil(unit.HP / atk_3) : ceil(unit.HP / atk_5) // 击败单位需要行动的次数

  // 主动攻击单位
  if (unit.atkDistance > unit.rely) {
    // 攻击距离大于与上一个单位的距离则缩小攻击距离
    unit.atkDistance = unit.rely
  }

  return unit
})


class Player {
  constructor(props) {
    // 初始化

    this.state = {
      units: __units,
      unitCount: 0, // 遭遇单位计数
      currentEncounterType: 0, // 当前遭遇类型： 0 -> 无, 1 -> 怪物, 2 -> 俘虏
      isForward: true, // 当前行动方向
      runing: true, // 行进中
      retreat: false, // 战术撤退
      retreatDistanceCount: 0, // 撤退距离计数
    }

    // 初始化方向
    this.verifyInversion()
  }

  playTurn(warrior) {
    // Cool code goes here.
    const {units, currentEncounterType, runing, retreat} = this.state
    let {unitCount, retreatDistanceCount, isForward} = this.state

    // 方法封装
    warrior = this.confirmed(warrior)

    const space = warrior._feel() // 感知区域，1个空格
    const spaceLook = warrior._look() // 感知区域，3个空格

    // 在远程感知区域内有单位 0 -> 无单位， 1 -> 俘虏， 2 -> 敌人， 3 -> 其他
    const unitList = spaceLook.map((item, index) => {
      if (item.isUnit()) {
        // 有单位
        const unit = item.getUnit()
        if (unit.isBound()) return [1, index]
        else if (unit.isEnemy()) return [2, index]
        return [3, index]
      } else {
        // 无单位
        return [0, index]
      }
    })
    // 远程感知区域第一个单位
    const firstUnit = unitList.find(item => item[0] > 0)

    if (space.isWall()) {
      // 墙体则转身
      warrior.pivot()
    } else if (firstUnit) {
      // 远程感知内有单位
      switch (firstUnit[0]) {
        case 1:
          // 俘虏
          if (firstUnit[1] > 0) {
            // 不在第一个位置 前进
            warrior._walk() // 前进
          } else {
            // 在第一个位置 营救
            this.updateCurrentEncounterType(2) // 变更遭遇状态
            warrior._rescue() // 营救
            if (unitList.filter(item => (item[0] > 0) && (item[0] < 3)).length > 1) {
              // 远程感知区域的单位至少2个
              this.addUnitCount() // 遭遇单位计数+1
            }
          }
          break
        case 2:
          // 敌人
          if (firstUnit[1] > 0) {
            // 不在第一个位置
            if (units[unitCount].atkDistance > 0) {
              // 具有远程攻击的单位
              this.updateCurrentEncounterType(1) // 变更遭遇状态
              warrior._shoot() // 射箭攻击
            } else {
              // 近战攻击单位
              warrior._walk() // 前进
            }
          } else {
            // 在第一个位置
            this.updateCurrentEncounterType(1) // 变更遭遇状态
            warrior._attack() // 攻击
          }
          break
        case 3:
          // 其他
          warrior._walk() // 前进
          break

        default:
          break
      }

    }
    /* } else if (space.isUnit()) {
      // 有单位
      this.updateRun(false) // 非行进中
      const unit = space.getUnit() // 获取该单位

      if (unit.isBound()) {
        // 该单位是俘虏
        this.updateCurrentEncounterType(2) // 变更遭遇状态
        warrior._rescue() // 营救
      } else if (unit.isEnemy()) {
        // 该单位是敌人
        this.updateCurrentEncounterType(1) // 变更遭遇状态
        warrior._attack() // 攻击
      } else {
        // 其他单位
        warrior._walk() // 前进
      }
    } */
    else {
      // 无单位
      if (currentEncounterType !== 0) {
        // 类型转变
        unitCount = this.addUnitCount() // 遭遇单位计数+1
        isForward = this.verifyInversion() // 方向重置

        if (units[unitCount] && (units[unitCount].atkDistance >= units[unitCount].rely)) {
          // 在当前单位的攻击范围中
          this.updateRun(true) // 继续行进
          if (retreat) {
            // 战术撤退
            isForward = this.verifyInversion('reverse') // 方向相反
          }
        }

        warrior = this.confirmed(warrior) // 方法重置
      }
      this.updateCurrentEncounterType(0) // 变更遭遇状态


      if (units[unitCount]) {
        const currentUnit = units[unitCount]
        const nextUnit = units[unitCount + 1]

        // 基础安全生命值
        const basicHP = isForward ? currentUnit.health : currentUnit.backHealth
        // 额外安全生命值： 攻击距离 x 攻击力
        const extraHP = currentUnit.atkDistance * currentUnit.atk
        // 连续的额外安全生命值： 假设击败当前单位之后在下一个单位攻击范围内 ? 下个单位的安全生命 : 0
        const nextExtraHP = nextUnit && nextUnit.atkDistance >= nextUnit.rely ? (((isForward ? nextUnit.health : nextUnit.backHealth) - 1) + (nextUnit.atk * nextUnit.atkDistance)) : 0

        // 需要的生命值
        const needHP = basicHP + extraHP + nextExtraHP
        // 当前血量
        const currentHP = warrior.health()

        // 检测血量安全程度
        if (currentHP < needHP) {
          // 血量危险
          if (needHP <= Jafish) {
            // 需求血量小于最大血量
            if (!runing && !retreat) {
              // 不在行进中 && 不在撤退中
              warrior.rest() // 恢复
            } else {
              // 行进中继续行进，针对远程单位
              warrior._walk() // 前进
              if (retreat) {
                // 撤退中
                retreatDistanceCount = this.addRetreatDistance() // 撤退距离计数
                // 撤退距离达到最大射程
                if (retreatDistanceCount >= (currentUnit.maxAtkDistance - currentUnit.atkDistance)) {
                  this.verifyInversion('reverse') // 方向相反
                  this.updateRun(false) // 停止前进
                  this.addRetreatDistance('reset') // 重置计数
                  this.updateRetreat(false) // 撤退完成
                }
              }
            }
          } else {
            // 需求血量溢出
            // 当前血量小于最大血量则恢复， -1防止溢出
            if (currentHP < Jafish - 1) {
              warrior.rest() // 恢复
            } else {
              this.updateRun(true) // 行进中
              this.updateRetreat(true) // 击败当前单位时，战术撤退补充血量
              warrior._walk() // 前进
            }
          }
        } else {
          // 血量安全
          this.updateRun(true) // 行进中
          warrior._walk() // 前进
        }
      } else {
        warrior._walk() // 前进
      }
    }
  }

  addRetreatDistance(reset) {
    // 撤退距离计数
    if (reset === 'reset') {
      return this.state.retreatDistanceCount = 0
    }

    return ++this.state.retreatDistanceCount
  }
  updateRetreat(retreat) {
    // 战术撤退，面对下一个单位血量不足
    return this.state.retreat = retreat
  }
  updateRun(runing) {
    // 改变行进状态
    return this.state.runing = runing
  }
  verifyInversion(direction) {
    // 确认当前单位的方向
    if (direction === 'reverse') {
      return this.state.isForward = !this.state.isForward
    }

    const {unitCount, units} = this.state

    if (units[unitCount] && units[unitCount].inversion) {
      // 反向行动
      return this.state.isForward = false
    } else {
      // 正向行动
      return this.state.isForward = true
    }
  }
  confirmed(warrior) {
    // 行动方向封装
    // backward 向后  forward 向前
    const {isForward} = this.state
    const confirmes = ['walk', 'feel', 'rescue', 'attack', 'look', 'shoot'] // 需要封装的api

    confirmes.forEach(item => warrior[`_${item}`] = isForward ? warrior[item].bind(warrior) : warrior[item].bind(warrior, 'backward'))

    return warrior
  }
  addUnitCount() {
    // 遭遇单位计数进度+1
    return ++this.state.unitCount
  }
  updateCurrentEncounterType(value) {
    // 改变当前遭遇状态
    return this.state.currentEncounterType = value
  }
}
;(function () {
  'use strict'

  angular.module('ffxivCraftOptWeb.components').directive('macros', factory)

  function factory() {
    return {
      restrict: 'E',
      templateUrl: 'components/macros.html',
      scope: {
        sequence: '=',
        cls: '=',
        options: '=',
      },
      controller: controller,
    }
  }

  function controller(
    $scope,
    $rootScope,
    $translate,
    _actionsByName,
    _allActions,
    _iActionClassSpecific
  ) {
    $scope.macroList = []
    $scope.macroForSomethingNeedDoing = true
    $scope.requireMacroString = ''

    $scope.$on('$translateChangeSuccess', update)
    $scope.$watchCollection('sequence', update)
    $scope.$watch('cls', update)
    $scope.$watchCollection('options', update)
    $scope.$watch('macroForSomethingNeedDoing', update)
    $scope.$watch('requireMacroString', update)
    $rootScope.$on('buffsChange', function (event, buffsData) {
      $scope.requireMacroString =
        (buffsData.food ? '/require 进食\n' : '') +
        (buffsData.medicine ? '/require 强化药\n' : '')
    })

    var MAX_LINES = $scope.macroForSomethingNeedDoing ? 99 : 15
    update()

    //////////////////////////////////////////////////////////////////////////

    function update() {
      if (!angular.isDefined($scope.sequence)) {
        return
      }

      var sequenceLines = buildSequenceLines(
        $scope.options,
        $scope.sequence,
        extractBuffs()
      )
      $scope.macroList = buildMacroList($scope.options, sequenceLines)
    }

    function extractBuffs() {
      var buffs = {}
      for (var i = 0; i < _allActions.length; i++) {
        var action = _allActions[i]
        if (action.buff) {
          buffs[action.shortName] = true
        }
      }
      return buffs
    }

    /**
     * Function used to display sound effect on macro
     *
     * @param num number of sound to use
     * @param sound {boolean} true if sound is enabled, false else
     * @returns {string}
     */
    function soundEffect(num, sound) {
      return sound ? '<se.' + num + '>' : ''
    }

    function buildSequenceLines(options, sequence, buffs) {
      var waitString =
        '<wait.' +
        ($scope.macroForSomethingNeedDoing
          ? options.waitTime - 0.4
          : options.waitTime) +
        '>'
      var buffWaitString =
        '<wait.' +
        ($scope.macroForSomethingNeedDoing
          ? options.buffWaitTime - 0.4
          : options.buffWaitTime) +
        '>'

      var lines = []

      for (var i = 0; i < sequence.length; i++) {
        var action = sequence[i]
        var info = _actionsByName[action] // This is the 'action' object
        var infoList = []

        if (!info) {
          lines.push({ text: '/echo Error: Unknown action ' + action, time: 0 })
          continue
        }

        // Ranged edit -- Because combos are 2 actions in one, they need special code for building the macro
        // I've put the line building in a for loop, to deal with combos
        if (info.isCombo) {
          for (
            var comboNumber = 0;
            comboNumber < info.comboActions.length;
            comboNumber++
          ) {
            infoList.push(_actionsByName[info.comboActions[comboNumber]])
          }
        } else {
          infoList.push(info)
        }

        for (var j = 0; j < infoList.length; j++) {
          var infoFromList = infoList[j]
          var actionFromList = infoFromList.shortName
          var actionName = $translate.instant(infoFromList.name)

          if (options.takeOutDoubleQuotationMarks) {
            var line = '/ac ' + actionName + ' '
          } else {
            var line = '/ac "' + actionName + '" '
          }

          var time
          if (buffs[actionFromList]) {
            line += buffWaitString
            time = $scope.macroForSomethingNeedDoing
              ? options.buffWaitTime - 0.4
              : options.buffWaitTime
          } else {
            line += waitString
            time = $scope.macroForSomethingNeedDoing
              ? options.waitTime - 0.4
              : options.waitTime
          }

          if($scope.macroForSomethingNeedDoing && infoFromList.name === "Great Strides") line += '<condition.!excellent>'
          lines.push({ text: line, time: time })
        }
      }

      return lines
    }

    function buildMacroList(options, lines) {
      var macroList = []

      var macroString = ''
      var macroLineCount = 0
      var macroTime = 0
      var macroIndex = 1

      if (options.includeMacroLock) {
        macroString += '/macrolock\n'
        macroLineCount++
      }

      for (var j = 0; j < lines.length; j++) {
        var line = lines[j]
        macroString += line.text + '\n'
        macroTime += line.time
        macroLineCount += 1

        if (macroLineCount === MAX_LINES - 1) {
          if (lines.length - (j + 1) > 1) {
            '/echo 宏 #' +
              macroIndex +
              ' 已完成！' +
              soundEffect(options.stepSoundEffect, options.stepSoundEnabled) +
              '\n'
            macroList.push({ text: macroString, time: macroTime })

            macroString = ''
            macroLineCount = 0
            macroTime = 0
            macroIndex += 1

            if (options.includeMacroLock) {
              macroString += '/macrolock\n'
              macroLineCount++
            }
          }
        }
      }

      if ($scope.macroForSomethingNeedDoing) {
        macroString += '/waitaddon "RecipeNote"\n/click "Synthesize"\n/loop\n'
        macroString = '/waitaddon "Synthesis"\n' + macroString
        macroString = $scope.requireMacroString + macroString
      }

      if (macroLineCount > 0) {
        if (macroLineCount < MAX_LINES && !$scope.macroForSomethingNeedDoing) {
          macroString +=
            '/echo 宏 #' +
            macroIndex +
            ' 已完成！' +
            soundEffect(options.finishSoundEffect, options.stepSoundEnabled) +
            '\n'
        }
        macroList.push({ text: macroString, time: macroTime })
      }

      return macroList
    }
  }
})()

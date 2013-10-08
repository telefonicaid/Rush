############################ Metrics tests #######################################
#!/bin/bash
# sh file to execute the files based on configuration file

echo "=========_______METRICS TESTS_______========="
echo ""
echo ">> Cleaning workspace"
 rm -rf *.log
echo ""
echo ">> Launching tests"
 grunt testAll > testResults.log

if [ "$1" == "" ]
then
echo "_______________________________"
echo ">> Product Size: "
cat testResults.log | grep "Single Feature" |  grep -c "#"
echo ">> Features"
cat testResults.log | grep "Single Feature" |  grep "#"
echo ">> Test-Set size"
#echo "________________"
echo ">> Coverage"
# TAGS:	#FCB	#FEN	#FOW	#FPE	#FPT	#FPX	#FRT	#FTOP	#FTID	#FHA	#CheckD	#FTC	#FEH	#LOG
echo " - Coverage feature:  Callback #FCB"
cat testResults.log | grep "✓" | grep -c "#FCB"

echo " - Coverage feature:  Encoding #FEN"
cat testResults.log | grep "✓" | grep -c "#FEN"

echo " - Coverage feature:  Oneway with HTTP #FOW"
cat testResults.log | grep "✓" | grep -c "#FOW"

echo " - Coverage feature:  Persistence #FPE"
cat testResults.log | grep "✓" | grep -c "#FPE"

echo " - Coverage feature:  Protocol #FPT"
cat testResults.log | grep "✓" | grep -c "#FPT"

echo " - Coverage feature:  Proxy Server #FPX"
cat testResults.log | grep "✓" | grep -c "#FPX"

echo " - Coverage feature:  Retry #FRT"
cat testResults.log | grep "✓" | grep -c "#FRT"

echo " - Coverage feature:  TraceID #FTID"
cat testResults.log | grep "✓" | grep -c "#FTID"

echo " - Coverage feature:  High Availability #FHA"
cat testResults.log | grep "-" | grep -c "#FHA"

echo " - Non Functional features like #CheckD"
echo "62* estimated TCs"

echo " - Coverage feature:  Target Certificate #FTC"
cat testResults.log | grep "✓" | grep -c "#FTC"

echo " - Coverage feature:  Extra header #FEH"
cat testResults.log | grep "✓" | grep -c "#FEH"

echo " - Non Functional features like #LOGS"
cat testResults.log | grep "✓" | grep -c "#LOGS"

echo " - Untracked Features #FXX"
cat testResults.log | grep "✓" | grep -v "#FPE" | grep -v "#FPT" | grep -v "#FPX" | grep -v "#FEN" | grep -v "#FEH" | grep -v "#FOW" | grep -v "#FCB"| grep -v "#FRT"| grep -v "#LOGS" |grep -v "#FTC" |grep -v "#FCT" |grep -c -v "#FTID"

#echo "________________"
echo ">> TC peer reviewed %"
echo "100%"
#echo "________________"
echo ">> TC automated %"
echo "90% (HA Scenarios are manual test)"
echo ">> TC Manual"
cat testResults.log | grep "tests pending"
echo ">> Component Test"
cat testResults.log | grep -c "#CT"

#echo "=======TOTAL======="
echo ">>   Passed tests  ##"
cat testResults.log | grep -c "✓"
echo "##    Results ##"
cat testResults.log | grep "tests complete"

echo "_______________________________"
fi



#1. Product size (⅀US aka #.features)
#·2. Test-Set size (⅀test-variants aka #datasets)
#3. Coverage (⅀test-variants on each US)
#4. TC peer reviewed %
#5. TC automated % (espero 100% para casi todos)
#6. Jira defects link


#cat testResults.log | grep "✓" | grep -v "#FPE" | grep -v "#FPT" | grep -v "#FPX" | grep -v "#FEN" | grep -v "#FEH" | grep -v "#FOW" | grep -v "#FCB"| grep -v "#FRT"| grep -v "#FTID"
#FPE|#FPT|#FPX|#FEN|#FEH|#FOW|#FCB|#FRT|#FTID


exit $?


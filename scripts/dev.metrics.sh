############################ DEV Metrics  #######################################
#!/bin/bash
# sh file to execute the files based on configuration file

echo ""
echo "=========_______METRICS TESTS_______========="
echo ""
echo ">> Cleaning workspace"
 rm -rf *.log
 rm -rf ../coverage
echo "### Clean DONE "

echo ">> Counting lines in /lib"
 sloc ../lib/ > slocLib.log
 sloc ../test/ > slocTest.log
echo "### Lines DONE /lib"

echo ">> Launching coding style"
 gjslint --max_line_length "120" --disable 0220,0210,0213 -r ../lib/ > lint.log
echo "### Style DONE /lib"

echo ">> Launching coverage tests"
 grunt coverage > testCoverage.log
echo "### Coverage DONE /lib"

echo ">> Printing stats:"

if [ "$1" == "" ]
then
echo "_________________________________________"
echo ">> Date: "
date
echo ">> Product: "
echo "HTTP Relayer (Rush) "

    #echo "__________LINES_____________________"
echo ">> Lines of Code: (only code)"
ddd=$(cat slocLib.log | grep "lines of source code" | awk -F : '{print $2}')
ddd=${ddd#"${ddd%%[![:space:]]*}"}
ccc=$(cat slocTest.log | grep "lines of source code" | awk -F : '{print $2}')
ccc=${ccc#"${ccc%%[![:space:]]*}"}
total=$ddd
let total+=ccc
#echo " +LIB: " $ddd " +TEST:" $ccc
echo " " $total
echo ">> #LoC Client/App: "
echo " --"
echo ">> #LoC Server: "
cat slocLib.log | grep "lines of source code" | awk -F : '{print $2}'
echo ">> #Loc U. Test Client/App: "
echo " --"
echo ">> "#Loc U.Test Server": "
cat slocTest.log | grep "lines of source code" | awk -F : '{print $2}'
echo "_________________________________________"

    #echo "_____________COVERAGE___________________"
echo ">> % Unit Test Cov"
cat ../coverage/lcov-report/index.html | grep "Statements: <span class=" | awk -F '[<>]' '{ print $3 }'
echo "_______________________________"

    #echo "__________CODING STYLE______________"
 cat lint.log | grep Found
echo "_________________________________________"
echo ""
echo "_________________________________________"
echo "_________________________________________"

echo ""

fi

exit $?
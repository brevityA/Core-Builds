@echo off
set APP_HOME=%~dp0
set WRAPPER=%APP_HOME%gradle\wrapper\gradle-wrapper.jar
if not exist "%WRAPPER%" (
  echo gradle-wrapper.jar is missing.
  echo Open ticker\android in Android Studio once — it will generate the wrapper.
  exit /b 1
)
if defined JAVA_HOME (
  set JAVACMD=%JAVA_HOME%\bin\java.exe
) else (
  set JAVACMD=java.exe
)
"%JAVACMD%" -Xmx64m -Xms64m -classpath "%WRAPPER%" org.gradle.wrapper.GradleWrapperMain %*

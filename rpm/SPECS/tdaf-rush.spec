# -------------------------------------------------------------------------------------------- #
# SPEC FILE for TDAF
# -------------------------------------------------------------------------------------------- #

# -------------------------------------------------------------------------------------------- #
# Preamble Section:
# -------------------------------------------------------------------------------------------- #

Summary: OAuth2 Authorization Server
Name: tdaf-api-authserver
Version: 0.5.8
Release: 1%{?dist}
License: Commercial
BuildRoot: %{_topdir}/BUILDROOT/
BuildArch: x86_64
# Requires: nodejs >= 0.8
Requires(post): /sbin/chkconfig, /usr/sbin/useradd
Requires(preun): /sbin/chkconfig, /sbin/service
Requires(postun): /sbin/service
Group: Applications/Rush
Vendor: Telefonica I+D
BuildRequires: npm

%description
Rush exploits the header stamping mechanism in order to configure every relayed request

# Project information
%define _prefix_company pdi-
%define _project_name tdaf-rush
%define _project_user %{_project_name}
%define _company_project_name %{_prefix_company}%{_project_name} 

# Service. There is no service
# %define _service_name authserverd

# System folders
%define _srcdir %{_sourcedir}/../../
%define _install_dir /opt
%define _project_install_dir %{_install_dir}/%{_company_project_name}

# _localstatedir is a system var that goes to /var
%define _authserver_log_dir %{_localstatedir}/log/%{_company_project_name}

# RPM Building folder
%define _build_root_project %{buildroot}%{_project_install_dir}


# -------------------------------------------------------------------------------------------- #
# prep section, setup macro:
# -------------------------------------------------------------------------------------------- #
%prep
echo "[INFO] Preparing installation"
# Create rpm/BUILDROOT folder
rm -Rf $RPM_BUILD_ROOT && mkdir -p $RPM_BUILD_ROOT
[ -d %{_build_root_project} ] || mkdir -p %{_build_root_project}

# Copy all from src to rpm/BUILDROOT/opt/pdi-tdaf-api-authserver
cp -R %{_srcdir}/bin \
      %{_srcdir}/config \
      %{_srcdir}/lib \
      %{_srcdir}/test \
      %{_srcdir}/i18n \
      %{_srcdir}/Gruntfile.js \
      %{_srcdir}/index.js \
      %{_srcdir}/npm-shrinkwrap.json \
      %{_srcdir}/package.json \
      %{_srcdir}/debug-patch.js \
      %{_srcdir}/README.md \
      %{_srcdir}/LICENSE-MIT \
      %{_build_root_project}

# Copy "extra files" from rpm/SOURCES to rpm/BUILDROOT
cp -R %{_sourcedir}/* %{buildroot}

# Create folder to store the PID (used by the Service)
mkdir -p %{buildroot}/var/run/%{_company_project_name}
# Create log folder
mkdir -p %{buildroot}/var/log/%{_company_project_name}

# -------------------------------------------------------------------------------------------- #
# Build section:
# -------------------------------------------------------------------------------------------- #
%build
echo "[INFO] Building RPM"
cd %{_build_root_project}

# Only production modules
rm -fR node_modules/
npm cache clear
npm config set production true
npm install --production
#rm package.json

# -------------------------------------------------------------------------------------------- #
# pre-install section:
# -------------------------------------------------------------------------------------------- #
%pre
echo "[INFO] Creating %{_project_user} user"
grep ^%{_project_user} /etc/passwd 
RET_VAL=$?
if [ "$RET_VAL" != "0" ]; then
      /usr/sbin/useradd -c '%{_project_user}' -u 699 -s /bin/false \
      -r -d %{_project_install_dir} %{_project_user}
      RET_VAL=$?
      if [ "$RET_VAL" != "0" ]; then
         echo "[ERROR] Unable create popbox user" \
         exit $RET_VAL
      fi
fi

# -------------------------------------------------------------------------------------------- #
# post-install section:
# -------------------------------------------------------------------------------------------- #
%post
echo "Configuring application:"

# Extra module needed. Not necessary, Vagrant should have it
# npm install --production -g grunt-cli
npm install optimist

#Service. There is no service
# rm -Rf /etc/init.d/%{_service_name}
cd /etc/init.d
echo "Creating %{_service_name} service:"
chkconfig --add %{_service_name}

#Config 
# rm -Rf %{_conf_dir} && mkdir -p %{_conf_dir}
# cd %{_conf_dir}
ln -s %{_project_install_dir}/config/config.production.js %{_project_install_dir}/config.js
ln -s %{_project_install_dir}/config/.env.production %{_project_install_dir}/.env

#Logs
#TODO configuration logs
echo "Done"

# -------------------------------------------------------------------------------------------- #
# pre-uninstall section:
# -------------------------------------------------------------------------------------------- #
%preun
if [ $1 == 0 ]; then
	# Service. There is no service
	echo "Destroying %{_service_name} service:"
	chkconfig --del %{_service_name}
	rm -Rf /etc/init.d/%{_service_name}
	
	# User: first force to logout and then remove from system
	# DISABLED ! 
	# echo "[INFO] Removing %{_project_user} user"
	# pkill -KILL -u %{_project_user}
	# /usr/sbin/userdel %{_project_user}
   
	echo "[INFO] Removing application config files"
	# Config. There is no extra configuration
	# [ -d /etc/%{_company_project_name} ] && rm -rfv /etc/%{_company_project_name}
	
	echo "[INFO] Removing application log files"
	# Log
	[ -d %{_authserver_log_dir} ] && rm -rfv %{_authserver_log_dir}
	
	echo "[INFO] Removing application files"
	# Installed files
	[ -d %{_project_install_dir} ] && rm -rfv %{_project_install_dir}
	
   echo "Done"
fi

# -------------------------------------------------------------------------------------------- #
# post-uninstall section:
# clean section:
# -------------------------------------------------------------------------------------------- #
%postun
%clean
rm -rf $RPM_BUILD_ROOT

# -------------------------------------------------------------------------------------------- #
# Files to add to the RPM 
# -------------------------------------------------------------------------------------------- #
%files
%defattr(755,%{_project_user},%{_project_user},755)
%config /etc/logrotate.d/%{_company_project_name}
%{_project_install_dir}
/var/

%config /etc/init.d/%{_service_name}

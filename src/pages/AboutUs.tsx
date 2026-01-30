
import { Building2, Users, Target, Shield, Code, Award } from 'lucide-react';
import Navbar from '../components/Navbar';

const AboutUs = () => {

  return (
    <div className="min-h-screen text-gray-800" style={{ backgroundColor: '#E7F2EF' }}>
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0 opacity-70"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}background.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />

      {/* Navbar */}
      <Navbar currentPage='About Us'/>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="text-center space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold" style={{ color: '#19183B' }}>
            About Us
          </h1>
          <p className="text-xl md:text-2xl max-w-3xl mx-auto" style={{ color: '#708993' }}>
            Empowering Indigenous Peoples through Digital Innovation
          </p>
        </div>
      </section>

      {/* Organization Info */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div 
          className="backdrop-blur-md border rounded-2xl p-8 md:p-12"
          style={{ 
            backgroundColor: '#ffffff99',
            borderColor: '#A1C2BD'
          }}
        >
          <div className="flex items-start gap-4 mb-6">
            <div 
              className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#A1C2BD33' }}
            >
              <Building2 className="w-8 h-8" style={{ color: '#708993' }} />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-2" style={{ color: '#19183B' }}>
                Our Organization
              </h2>
              <p className="text-lg leading-relaxed" style={{ color: '#708993' }}>
                Pluma is developed and maintained by the <span className="font-semibold" style={{ color: '#19183B' }}>Information and Communication Technology Division (ICTD)</span>, operating under the <span className="font-semibold" style={{ color: '#19183B' }}>Bureau of the Office of Policy Planning and Research (OPPR)</span> within the <span className="font-semibold" style={{ color: '#19183B' }}>National Commission on Indigenous Peoples (NCIP)</span>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid md:grid-cols-2 gap-8">
          <div 
            className="backdrop-blur-md border rounded-2xl p-8"
            style={{ 
              backgroundColor: '#ffffff99',
              borderColor: '#A1C2BD'
            }}
          >
            <div 
              className="w-16 h-16 rounded-lg flex items-center justify-center mb-6"
              style={{ backgroundColor: '#A1C2BD33' }}
            >
              <Target className="w-8 h-8" style={{ color: '#708993' }} />
            </div>
            <h3 className="text-2xl font-bold mb-4" style={{ color: '#19183B' }}>
              Our Mission
            </h3>
            <p className="leading-relaxed" style={{ color: '#708993' }}>
              To provide secure, efficient, and accessible digital signature solutions that support the NCIP's mandate of protecting and promoting the rights of Indigenous Peoples through innovative technology and digital transformation.
            </p>
          </div>

          <div 
            className="backdrop-blur-md border rounded-2xl p-8"
            style={{ 
              backgroundColor: '#ffffff99',
              borderColor: '#A1C2BD'
            }}
          >
            <div 
              className="w-16 h-16 rounded-lg flex items-center justify-center mb-6"
              style={{ backgroundColor: '#A1C2BD33' }}
            >
              <Shield className="w-8 h-8" style={{ color: '#708993' }} />
            </div>
            <h3 className="text-2xl font-bold mb-4" style={{ color: '#19183B' }}>
              Our Commitment
            </h3>
            <p className="leading-relaxed" style={{ color: '#708993' }}>
              We are committed to delivering government-grade security through PNPKI DICT compliance, ensuring that every digital signature is legally binding, tamper-proof, and trusted by all stakeholders.
            </p>
          </div>
        </div>
      </section>

      {/* What We Do */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4" style={{ color: '#19183B' }}>
            What We Do
          </h2>
          <p className="text-xl max-w-3xl mx-auto" style={{ color: '#708993' }}>
            ICTD provides comprehensive digital solutions to support NCIP operations
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div 
            className="backdrop-blur-md border rounded-xl p-8 transition-all duration-300 hover:shadow-xl"
            style={{ 
              backgroundColor: '#ffffff99',
              borderColor: '#A1C2BD'
            }}
          >
            <div 
              className="w-14 h-14 rounded-lg flex items-center justify-center mb-6"
              style={{ backgroundColor: '#A1C2BD33' }}
            >
              <Code className="w-7 h-7" style={{ color: '#708993' }} />
            </div>
            <h3 className="text-xl font-bold mb-3" style={{ color: '#19183B' }}>
              Digital Signature Solutions
            </h3>
            <p style={{ color: '#708993' }}>
              Developing and maintaining secure platforms for document signing and verification using PNPKI DICT standards.
            </p>
          </div>

          <div 
            className="backdrop-blur-md border rounded-xl p-8 transition-all duration-300 hover:shadow-xl"
            style={{ 
              backgroundColor: '#ffffff99',
              borderColor: '#A1C2BD'
            }}
          >
            <div 
              className="w-14 h-14 rounded-lg flex items-center justify-center mb-6"
              style={{ backgroundColor: '#A1C2BD33' }}
            >
              <Users className="w-7 h-7" style={{ color: '#708993' }} />
            </div>
            <h3 className="text-xl font-bold mb-3" style={{ color: '#19183B' }}>
              Technical Support
            </h3>
            <p style={{ color: '#708993' }}>
              Providing technical assistance and training to NCIP staff and stakeholders on digital tools and platforms.
            </p>
          </div>

          <div 
            className="backdrop-blur-md border rounded-xl p-8 transition-all duration-300 hover:shadow-xl"
            style={{ 
              backgroundColor: '#ffffff99',
              borderColor: '#A1C2BD'
            }}
          >
            <div 
              className="w-14 h-14 rounded-lg flex items-center justify-center mb-6"
              style={{ backgroundColor: '#A1C2BD33' }}
            >
              <Award className="w-7 h-7" style={{ color: '#708993' }} />
            </div>
            <h3 className="text-xl font-bold mb-3" style={{ color: '#19183B' }}>
              Policy Compliance
            </h3>
            <p style={{ color: '#708993' }}>
              Ensuring all digital solutions comply with government standards, security protocols, and legal requirements.
            </p>
          </div>
        </div>
      </section>

      {/* NCIP Context */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div 
          className="backdrop-blur-md border rounded-2xl p-8 md:p-12"
          style={{ 
            backgroundColor: '#19183B',
            borderColor: '#708993'
          }}
        >
          <h2 className="text-3xl font-bold mb-6 text-center" style={{ color: '#E7F2EF' }}>
            About NCIP
          </h2>
          <p className="text-lg leading-relaxed text-center max-w-4xl mx-auto" style={{ color: '#A1C2BD' }}>
            The National Commission on Indigenous Peoples is the primary government agency responsible for the formulation and implementation of policies, plans, and programs to promote and protect the rights and well-being of Indigenous Cultural Communities/Indigenous Peoples (ICCs/IPs) and the recognition of their ancestral domains as well as their rights thereto.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 backdrop-blur-md border-t py-8" style={{ backgroundColor: '#19183Bee', borderColor: '#708993' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center" style={{ color: '#A1C2BD' }}>
            <p className="mb-2 font-semibold" style={{ color: '#E7F2EF' }}>
              ICTD - Bureau of OPPR
            </p>
            <p>National Commission on Indigenous Peoples</p>
            <p className="mt-4">&copy; 2025 Pluma. All rights reserved. Powered by PNPKI DICT.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AboutUs;
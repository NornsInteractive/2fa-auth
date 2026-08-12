#pragma once
#include <string>

namespace std {
  template <> struct char_traits<unsigned char> : public char_traits<char> {
    typedef unsigned char char_type;
  };
}
